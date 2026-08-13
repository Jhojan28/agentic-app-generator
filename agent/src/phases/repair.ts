import fs from "node:fs";
import type { LlmClient, ChatMessage } from "../llm";
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
    const response = await llm.chat(messages, REPAIR_TOOLS);
    messages.push(response);
    const calls = response.tool_calls ?? [];
    if (calls.length === 0) return sawToolCall; // done, or model can't do tools
    sawToolCall = true;
    for (const call of calls) {
      const raw = executeTool(appDir, call.function.name, call.function.arguments);
      const result =
        raw.length > 8000
          ? `${raw.slice(0, 8000)}\n[... truncated at 8000 chars — the real file is longer ...]`
          : raw;
      console.log(
        `[repair]   ${call.function.name} (${raw.length}B) -> ${raw.split("\n")[0]?.slice(0, 60)}`
      );
      messages.push({ role: "tool", tool_call_id: call.id, content: result || "(empty file)" });
    }
  }
  return sawToolCall;
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
