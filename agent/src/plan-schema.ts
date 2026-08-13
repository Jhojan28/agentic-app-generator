import type { PlanTask } from "./types";

const ALLOWED_ROOT_FILES = new Set([
  "index.html",
  "vite.config.ts",
  "vitest.config.ts",
  "tsconfig.json",
]);

const ALLOWED_HINT = `paths must start with "src/" or be one of: ${[...ALLOWED_ROOT_FILES].join(", ")}`;

export function isSafeProjectPath(file: string): boolean {
  if (file.length === 0 || file !== file.trim()) return false; // whitespace/newline padding
  if (file.endsWith("/")) return false; // a directory, not a file
  for (const ch of file) {
    if ((ch.codePointAt(0) ?? 0) < 33) return false; // control chars and spaces
  }
  if (file.includes("..") || file.startsWith("/") || file.includes("\\")) return false;
  return file.startsWith("src/") || ALLOWED_ROOT_FILES.has(file);
}

/** Structurally validate the LLM-produced plan. Throws descriptive errors
 *  (the messages are fed back to the model on the retry prompt). */
export function validatePlan(raw: unknown): PlanTask[] {
  if (!Array.isArray(raw)) throw new Error("Plan must be a JSON array of tasks");
  if (raw.length === 0 || raw.length > 30)
    throw new Error(`Plan must contain 1-30 tasks, got ${raw.length}`);

  const ids = new Set<string>();
  const tasks: PlanTask[] = [];
  for (const [i, item] of raw.entries()) {
    if (typeof item !== "object" || item === null)
      throw new Error(`Task ${i} is not an object`);
    const { id, file, action, description, dependsOn } = item as Record<string, unknown>;
    if (typeof id !== "string" || id.length === 0)
      throw new Error(`Task ${i}: "id" must be a non-empty string`);
    if (ids.has(id)) throw new Error(`Duplicate task id "${id}"`);
    ids.add(id);
    if (typeof file !== "string" || !isSafeProjectPath(file))
      throw new Error(
        `Task "${id}": "file" is not writable by this agent — ${ALLOWED_HINT} ` +
          `(got ${JSON.stringify(file).slice(0, 120)})`
      );
    if (action !== "create" && action !== "modify")
      throw new Error(`Task "${id}": "action" must be "create" or "modify"`);
    if (typeof description !== "string" || description.length === 0)
      throw new Error(`Task "${id}": "description" must be a non-empty string`);
    if (!Array.isArray(dependsOn) || dependsOn.some((d) => typeof d !== "string"))
      throw new Error(`Task "${id}": "dependsOn" must be an array of task ids`);
    tasks.push({ id, file, action, description, dependsOn: dependsOn as string[] });
  }
  for (const t of tasks)
    for (const d of t.dependsOn)
      if (!ids.has(d)) throw new Error(`Task "${t.id}" depends on unknown task "${d}"`);
  return tasks;
}
