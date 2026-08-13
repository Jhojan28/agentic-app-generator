import type { LlmClient } from "../llm";
import type { PlanTask } from "../types";
import type { ContextPack } from "../context";
import { SYSTEM_PROMPT, planPrompt } from "../prompts";
import { extractJson } from "../lib/extract";
import { validatePlan } from "../plan-schema";
import { topoSort } from "../lib/toposort";

/** One LLM call -> validated, dependency-ordered task list (1 retry on bad output). */
export async function plan(
  llm: LlmClient,
  spec: string,
  pack: ContextPack
): Promise<PlanTask[]> {
  const prompt = planPrompt(spec, pack);
  let response = await llm.chat([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ]);
  for (let attempt = 0; ; attempt++) {
    try {
      return topoSort(validatePlan(extractJson(response.content ?? "")));
    } catch (err) {
      const message = (err as Error).message;
      if (attempt >= 1) throw new Error(`Could not obtain a valid plan: ${message}`);
      console.log(`[plan] invalid plan (${message}) — asking the model to correct it`);
      response = await llm.chat([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
        { role: "assistant", content: response.content?.trim() || "(empty response)" },
        {
          role: "user",
          content: `Your plan was rejected: ${message}. Respond again with ONLY the corrected JSON array.`,
        },
      ]);
    }
  }
}
