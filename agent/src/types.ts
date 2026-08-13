export interface PlanTask {
  id: string;
  file: string;
  action: "create" | "modify";
  description: string;
  dependsOn: string[];
}

/** All paths are absolute (resolved in config.ts) — resolveSafe depends on this. */
export interface AgentConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxLlmCalls: number;
  maxOutputTokens: number;
  specPath: string;
  outputDir: string;
  boilerplateDir: string;
}
