import fs from "node:fs";
import type { LlmClient, ChatMessage } from "../llm";
import { ToolUseFailedError, RequestTooLargeError } from "../llm";
import { REPAIR_TOOLS, executeTool } from "../tools";
import {
  SYSTEM_PROMPT,
  REPAIR_SYSTEM_PROMPT,
  repairUserPrompt,
  regenerateFilePrompt,
} from "../prompts";
import { extractCodeBlock } from "../lib/extract";
import { resolveSafe } from "../lib/safe-path";
import { validate, type ValidationResult } from "./validate";

const MAX_ROUNDS = 3; // full validate->fix cycles
const MAX_TOOL_TURNS = 10; // LLM turns inside one tool loop
const TOOL_RESULT_CHARS = 5000;
const KEEP_RECENT_TOOL_RESULTS = 2;

const FALLBACK_SYSTEM_PROMPT = `${SYSTEM_PROMPT}

Repair constraints:
- Never modify package.json or add dependencies; the toolchain is fixed.
- Never delete tests, skip them, or weaken assertions to make them pass. Fix the implementation.`;

/** Bounded tool-calling repair loop with whole-file-regeneration fallback. */
export async function repair(
  llm: LlmClient,
  appDir: string,
  firstFailure: ValidationResult
): Promise<{ ok: boolean; rounds: number }> {
  let failure = firstFailure;
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    console.log(`[repair] round ${round}/${MAX_ROUNDS} — failed step: ${failure.failedStep}`);
    const usedTools = await toolLoop(llm, appDir, failure, round);
    if (!usedTools) await regenerateFallback(llm, appDir, failure);
    const check = validate(appDir);
    if (check.ok) return { ok: true, rounds: round };
    failure = check;
  }
  return { ok: false, rounds: MAX_ROUNDS };
}

/** Returns true if the model made at least one tool call (i.e. can use tools). */
async function toolLoop(
  llm: LlmClient,
  appDir: string,
  failure: ValidationResult,
  round: number
): Promise<boolean> {
  const messages: ChatMessage[] = [
    { role: "system", content: REPAIR_SYSTEM_PROMPT },
    {
      role: "user",
      content: repairUserPrompt(failure.failedStep ?? "unknown", failure.output, round),
    },
  ];
  let sawToolCall = false;
  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    let response: ChatMessage;
    try {
      response = await llm.chat(messages, REPAIR_TOOLS);
    } catch (err) {
      if (err instanceof ToolUseFailedError) {
        console.log(
          "[repair] provider cannot parse this model's tool calls — switching to regeneration fallback"
        );
        return sawToolCall; // false on first turn -> regenerateFallback runs
      }
      if (err instanceof RequestTooLargeError) {
        console.log(
          "[repair] repair conversation no longer fits the provider's request-size limits — ending tool loop"
        );
        return sawToolCall;
      }
      throw err;
    }
    messages.push(response);
    const calls = response.tool_calls ?? [];
    if (calls.length === 0) return sawToolCall; // done, or model can't do tools
    sawToolCall = true;
    for (const call of calls) {
      const raw = executeTool(appDir, call.function.name, call.function.arguments);
      const result =
        raw.length > TOOL_RESULT_CHARS
          ? `${raw.slice(0, TOOL_RESULT_CHARS)}\n[... truncated — the real content is longer ...]`
          : raw;
      console.log(
        `[repair]   ${call.function.name} (${raw.length}B) -> ${raw.split("\n")[0]?.slice(0, 60)}`
      );
      messages.push({ role: "tool", tool_call_id: call.id, content: result || "(empty file)" });
    }
    compressOlderToolResults(messages);
  }
  return sawToolCall;
}

/** Keep only the most recent tool results in full; stub older ones so the
 *  repair conversation fits providers with small per-minute token windows.
 *  The model can always re-read a file it still needs. */
export function compressOlderToolResults(
  messages: ChatMessage[],
  keepRecent = KEEP_RECENT_TOOL_RESULTS
): void {
  const toolIndexes = messages
    .map((m, i) => (m.role === "tool" ? i : -1))
    .filter((i) => i !== -1);
  for (const i of toolIndexes.slice(0, Math.max(0, toolIndexes.length - keepRecent))) {
    const msg = messages[i];
    if (msg && msg.content && msg.content.length > 400) {
      msg.content = `${msg.content.slice(0, 400)}\n[older result truncated to save context — call the tool again if needed]`;
    }
  }
}

/** Weak-model fallback: regenerate whole files named in the error output. */
async function regenerateFallback(
  llm: LlmClient,
  appDir: string,
  failure: ValidationResult
): Promise<void> {
  console.log("[repair] model made no tool calls — falling back to whole-file regeneration");
  const errorLines = failure.output
    .split("\n")
    .filter((l) => /error|FAIL|×|✕|AssertionError|❯/i.test(l))
    .join("\n");
  const files = [...new Set(errorLines.match(/src\/[\w./-]+\.(?:tsx?|css)/g) ?? [])].slice(0, 3);
  for (const file of files) {
    const abs = resolveSafe(appDir, file);
    if (!fs.existsSync(abs)) continue;
    const response = await llm.chat([
      { role: "system", content: FALLBACK_SYSTEM_PROMPT },
      {
        role: "user",
        content: regenerateFilePrompt(file, fs.readFileSync(abs, "utf8"), failure.output),
      },
    ]);
    const code = extractCodeBlock(response.content ?? "");
    if (!/\b(import|export|const|function)\b/.test(code)) {
      console.log(`[repair]   skipped ${file} — response did not look like code`);
      continue;
    }
    fs.writeFileSync(abs, code);
    console.log(`[repair]   regenerated ${file}`);
  }
}
