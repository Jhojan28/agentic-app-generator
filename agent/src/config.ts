import fs from "node:fs";
import path from "node:path";
import type { AgentConfig } from "./types";

/** Minimal .env parser — avoids a dotenv dependency. */
export function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const body = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || !m[1]) continue;
    let value = m[2] ?? "";
    const quoted =
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2);
    if (quoted) {
      value = value.slice(1, -1);
    } else {
      const hash = value.indexOf(" #");
      if (hash !== -1) value = value.slice(0, hash).trim();
    }
    out[m[1]] = value;
  }
  return out;
}

/** Load .env files. Per key: real environment variables win over any file; among files, earlier dirs win over later ones. */
export function loadDotEnv(dirs: string[]): void {
  for (const dir of dirs) {
    const file = path.join(dir, ".env");
    if (!fs.existsSync(file)) continue;
    const parsed = parseEnvFile(fs.readFileSync(file, "utf8"));
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}

export function buildConfig(
  args: { spec: string; output: string },
  repoRoot: string
): AgentConfig {
  const apiKey = process.env["LLM_API_KEY"] ?? "";
  if (!apiKey) {
    throw new Error(
      "LLM_API_KEY is not set. Copy .env.example to .env and add your provider key."
    );
  }
  const maxLlmCalls = Number(process.env["AGENT_MAX_LLM_CALLS"] ?? 60);
  if (!Number.isFinite(maxLlmCalls) || maxLlmCalls <= 0) {
    throw new Error(
      `AGENT_MAX_LLM_CALLS must be a positive number (got "${String(process.env["AGENT_MAX_LLM_CALLS"])}")`
    );
  }
  const maxOutputTokens = Number(process.env["LLM_MAX_OUTPUT_TOKENS"] ?? 16000);
  if (!Number.isFinite(maxOutputTokens) || maxOutputTokens <= 0) {
    throw new Error(
      `LLM_MAX_OUTPUT_TOKENS must be a positive number (got "${String(process.env["LLM_MAX_OUTPUT_TOKENS"])}")`
    );
  }
  const rawReasoningEffort = process.env["LLM_REASONING_EFFORT"];
  let reasoningEffort: "none" | "low" | "medium" | "high" | undefined;
  if (rawReasoningEffort !== undefined) {
    if (
      rawReasoningEffort !== "none" &&
      rawReasoningEffort !== "low" &&
      rawReasoningEffort !== "medium" &&
      rawReasoningEffort !== "high"
    ) {
      throw new Error(
        `LLM_REASONING_EFFORT must be one of none, low, medium, high (got "${rawReasoningEffort}")`
      );
    }
    reasoningEffort = rawReasoningEffort;
  }
  return {
    baseUrl: (process.env["LLM_BASE_URL"] ?? "https://api.anthropic.com/v1").replace(/\/+$/, ""),
    apiKey,
    model: process.env["LLM_MODEL"] ?? "claude-opus-5",
    maxLlmCalls,
    maxOutputTokens,
    ...(reasoningEffort !== undefined ? { reasoningEffort } : {}),
    specPath: path.resolve(args.spec),
    outputDir: path.resolve(args.output),
    boilerplateDir: path.join(repoRoot, "boilerplate"),
  };
}
