import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface ValidationResult {
  ok: boolean;
  failedStep?: string;
  output: string;
}

// Bound the error context fed back to the model. tsc prints root causes FIRST
// and cascades after; vitest puts failures + summary LAST — keep both ends.
const HEAD_CHARS = 2500;
const TAIL_CHARS = 3500;

function bounded(output: string): string {
  if (output.length <= HEAD_CHARS + TAIL_CHARS) return output;
  return `${output.slice(0, HEAD_CHARS)}\n[... truncated ...]\n${output.slice(-TAIL_CHARS)}`;
}

export function runStep(
  cwd: string,
  command: string,
  args: string[]
): { ok: boolean; output: string } {
  const res = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 10 * 60 * 1000,
  });
  let output = `${res.stdout ?? ""}\n${res.stderr ?? ""}`.trim();
  if (res.error) {
    output = `${output}\n[spawn: ${res.error.message}${res.signal ? `, signal ${res.signal}` : ""}]`.trim();
  }
  return { ok: res.status === 0, output: bounded(output) };
}

/** npm install (first run only) + typecheck + tests, stopping at first failure. */
export function validate(appDir: string): ValidationResult {
  if (!fs.existsSync(path.join(appDir, "node_modules"))) {
    console.log("[validate] npm install (first run)...");
    const install = runStep(appDir, "npm", ["install", "--no-audit", "--no-fund"]);
    if (!install.ok) return { ok: false, failedStep: "npm install", output: install.output };
  }
  console.log("[validate] npm run typecheck...");
  const typecheck = runStep(appDir, "npm", ["run", "typecheck"]);
  if (!typecheck.ok) return { ok: false, failedStep: "typecheck", output: typecheck.output };
  console.log("[validate] npm run test...");
  const tests = runStep(appDir, "npm", ["run", "test"]);
  if (!tests.ok) return { ok: false, failedStep: "test", output: tests.output };
  return { ok: true, output: "typecheck + tests passed" };
}
