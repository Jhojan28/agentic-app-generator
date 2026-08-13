import fs from "node:fs";
import path from "node:path";
import type { LlmClient } from "../llm";
import type { PlanTask } from "../types";
import type { ContextPack } from "../context";
import { SYSTEM_PROMPT, generatePrompt } from "../prompts";
import { extractCodeBlock } from "../lib/extract";
import { resolveSafe } from "../lib/safe-path";

/** Generate each task's file in dependency order; deps are re-read from disk
 *  so each prompt carries only the context that task declared it needs. */
export async function generate(
  llm: LlmClient,
  spec: string,
  tasks: PlanTask[],
  pack: ContextPack,
  outputDir: string
): Promise<string[]> {
  const written: string[] = [];
  const fileByTaskId = new Map(tasks.map((t) => [t.id, t.file]));

  for (const [i, task] of tasks.entries()) {
    console.log(`[generate] (${i + 1}/${tasks.length}) ${task.action} ${task.file}`);
    const depFiles: Record<string, string> = {};
    for (const depId of task.dependsOn) {
      const depFile = fileByTaskId.get(depId);
      if (!depFile) continue;
      const abs = resolveSafe(outputDir, depFile);
      if (fs.existsSync(abs)) depFiles[depFile] = fs.readFileSync(abs, "utf8");
    }
    if (task.action === "modify") {
      const abs = resolveSafe(outputDir, task.file);
      if (fs.existsSync(abs)) depFiles[task.file] = fs.readFileSync(abs, "utf8");
    }

    try {
      const response = await llm.chat([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: generatePrompt(spec, task, depFiles, pack, tasks) },
      ]);
      const code = extractCodeBlock(response.content ?? "");
      const abs = resolveSafe(outputDir, task.file);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, code);
      written.push(task.file);
    } catch (err) {
      throw new Error(
        `Task ${task.id} (${task.action} ${task.file}) failed: ${(err as Error).message}`
      );
    }
  }
  return [...new Set(written)];
}
