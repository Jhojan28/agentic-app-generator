import type { PlanTask } from "../types";

/** Depth-first topological sort. Throws on cycles or unknown ids. */
export function topoSort(tasks: PlanTask[]): PlanTask[] {
  // Assumes caller already rejected duplicate ids (validatePlan) — dupes here would silently collapse.
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const visiting = new Set<string>();
  const done = new Set<string>();
  const ordered: PlanTask[] = [];

  function visit(id: string): void {
    if (done.has(id)) return;
    if (visiting.has(id)) throw new Error(`Dependency cycle involving task "${id}"`);
    visiting.add(id);
    const t = byId.get(id);
    if (!t) throw new Error(`Unknown task id "${id}"`);
    for (const dep of t.dependsOn) visit(dep);
    visiting.delete(id);
    done.add(id);
    ordered.push(t);
  }

  for (const t of tasks) visit(t.id);
  return ordered;
}
