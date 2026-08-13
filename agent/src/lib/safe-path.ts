import path from "node:path";

/** Resolve `relative` inside `root`, refusing any path that escapes it.
 *  Every model-supplied path (plan files, tool calls) goes through this. */
export function resolveSafe(root: string, relative: string): string {
  const rootResolved = path.resolve(root);
  const resolved = path.resolve(rootResolved, relative);
  if (resolved !== rootResolved && !resolved.startsWith(rootResolved + path.sep)) {
    throw new Error(`Path escapes project root: ${relative}`);
  }
  return resolved;
}
