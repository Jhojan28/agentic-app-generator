import fs from "node:fs";
import path from "node:path";
import type { ToolDef } from "./llm";
import { resolveSafe } from "./lib/safe-path";
import { isSafeProjectPath } from "./plan-schema";
import { runStep } from "./phases/validate";

export const REPAIR_TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a file from the generated app. Returns its full content.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path, e.g. src/App.tsx" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "Overwrite a file in the generated app with new COMPLETE content (never a fragment or diff).",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path, e.g. src/App.tsx" },
          content: { type: "string", description: "The complete new file content" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_typecheck",
      description: "Run `npm run typecheck` in the generated app and return PASS/FAIL plus output.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "run_tests",
      description: "Run `npm run test` in the generated app and return PASS/FAIL plus output.",
      parameters: { type: "object", properties: {} },
    },
  },
];

/** Execute one repair tool call. Errors are returned as strings so the model can react. */
export function executeTool(appDir: string, name: string, argsJson: string): string {
  let args: Record<string, unknown> = {};
  try {
    args = argsJson ? (JSON.parse(argsJson) as Record<string, unknown>) : {};
  } catch {
    return `ERROR: tool arguments were not valid JSON: ${argsJson.slice(0, 200)}`;
  }
  try {
    switch (name) {
      case "read_file": {
        const abs = resolveSafe(appDir, String(args["path"] ?? ""));
        if (!fs.existsSync(abs)) return `ERROR: file not found: ${String(args["path"])}`;
        return fs.readFileSync(abs, "utf8");
      }
      case "write_file": {
        const rel = String(args["path"] ?? "");
        if (!isSafeProjectPath(rel)) {
          return `ERROR: write_file refused: ${rel} is not writable by this agent (paths must start with "src/" or be index.html, vite.config.ts, vitest.config.ts, tsconfig.json).`;
        }
        const abs = resolveSafe(appDir, rel);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, String(args["content"] ?? ""));
        return `OK: wrote ${rel}`;
      }
      case "run_typecheck": {
        const res = runStep(appDir, "npm", ["run", "typecheck"]);
        return `${res.ok ? "PASS" : "FAIL"}\n${res.output}`;
      }
      case "run_tests": {
        const res = runStep(appDir, "npm", ["run", "test"]);
        return `${res.ok ? "PASS" : "FAIL"}\n${res.output}`;
      }
      default:
        return `ERROR: unknown tool "${name}"`;
    }
  } catch (err) {
    return `ERROR: ${(err as Error).message}`;
  }
}
