import { UsageTracker } from "./report";

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolDef {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: ChatMessage; finish_reason?: string }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

const MAX_ATTEMPTS = 4;
const MAX_OUTPUT_TOKENS = 16000;
const REQUEST_TIMEOUT_MS = 120_000;

/** Backoff for retryable failures: honor Retry-After (capped at 60s), else exponential. */
export function backoffMs(attempt: number, retryAfterHeader: string | null): number {
  const ra = Number(retryAfterHeader);
  if (Number.isFinite(ra) && ra > 0) return Math.min(ra * 1000, 60_000);
  return 1000 * 2 ** attempt;
}

/** Extract and NORMALIZE the assistant message from a chat-completions body.
 *  Providers return 200s with error-shaped bodies (OpenRouter upstream failures)
 *  and attach non-standard fields (reasoning, annotations) that stricter
 *  providers reject when echoed back — so we rebuild the message from scratch.
 *  Throws with the body attached so failures are diagnosable per-provider. */
export function extractMessage(data: unknown): ChatMessage {
  const resp = data as ChatCompletionResponse;
  const choice = resp?.choices?.[0];
  const message = choice?.message;
  if (!message) {
    throw new Error(`Provider returned no choices. Body: ${JSON.stringify(data).slice(0, 500)}`);
  }
  if (choice.finish_reason === "length") {
    throw new Error(
      `Response truncated at ${MAX_OUTPUT_TOKENS} output tokens — the generated content is incomplete.`
    );
  }
  const normalized: ChatMessage = { role: "assistant", content: message.content ?? null };
  if (message.tool_calls && message.tool_calls.length > 0) {
    normalized.tool_calls = message.tool_calls;
  }
  return normalized;
}

/**
 * Minimal OpenAI-compatible chat completions client (raw fetch, zero deps).
 * Works with Anthropic (OpenAI-compat endpoint), Groq, OpenAI, Gemini
 * (OpenAI-compat endpoint), and OpenRouter — auth is Bearer on all of them.
 */
export class LlmClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
    private readonly tracker: UsageTracker,
    private readonly maxCalls: number
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async chat(messages: ChatMessage[], tools?: ToolDef[]): Promise<ChatMessage> {
    // Check-then-act is safe because the pipeline is strictly sequential.
    if (this.tracker.calls >= this.maxCalls) {
      throw new Error(
        `LLM call budget exhausted (${this.maxCalls} calls). Aborting to protect cost — raise AGENT_MAX_LLM_CALLS to override.`
      );
    }
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      // Both spellings: OpenAI reasoning models reject max_tokens; everyone else ignores the other.
      max_tokens: MAX_OUTPUT_TOKENS,
      max_completion_tokens: MAX_OUTPUT_TOKENS,
    };
    if (tools && tools.length > 0) body["tools"] = tools;

    let lastError = "";
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }).catch((err: Error) => err);

      let retryAfter: string | null = null;
      if (res instanceof Error) {
        lastError = `network error: ${res.message}`;
      } else {
        retryAfter = res.headers.get("retry-after");
        const raw = await res.text();
        if (res.ok) {
          let parsed = false;
          let data: unknown;
          try {
            data = JSON.parse(raw);
            parsed = true;
          } catch {
            lastError = `malformed JSON response: ${raw.slice(0, 500)}`;
          }
          if (parsed) {
            const usage = (data as ChatCompletionResponse).usage;
            this.tracker.add(usage?.prompt_tokens ?? 0, usage?.completion_tokens ?? 0);
            return extractMessage(data);
          }
        } else {
          lastError = `HTTP ${res.status}: ${raw.slice(0, 500)}`;
          // OpenAI reasoning models reject the presence of max_tokens outright;
          // drop it once and retry immediately (costs one attempt).
          if (res.status === 400 && raw.includes("max_tokens") && "max_tokens" in body) {
            delete body["max_tokens"];
            continue;
          }
          // Only 429 and 5xx are retryable; anything else is a config/request bug.
          if (res.status !== 429 && res.status < 500) {
            throw new Error(`LLM request failed (not retryable). ${lastError}`);
          }
        }
      }
      if (attempt < MAX_ATTEMPTS) await sleep(backoffMs(attempt, retryAfter));
    }
    throw new Error(`LLM request failed after ${MAX_ATTEMPTS} attempts. Last: ${lastError}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
