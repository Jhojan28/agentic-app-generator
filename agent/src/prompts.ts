import type { PlanTask } from "./types";
import type { ContextPack } from "./context";
import { renderContext } from "./context";

export const SYSTEM_PROMPT = `You are a senior React + TypeScript engineer generating production code into an existing Vite boilerplate.

Stack: React 19, TypeScript (strict, noUncheckedIndexedAccess, noUnusedLocals, noUnusedParameters), Vite, Apollo Client 3, Material UI v6, MSW 2 (mock GraphQL API), Vitest + Testing Library.

Hard rules:
- Import project files with the "@/" alias (e.g. import { tokens } from "@/theme").
- Use the design tokens from "@/theme" through the MUI theme (sx prop / styled API). Never hardcode hex colors in components.
- In the sx prop, write radii as px strings — sx={{ borderRadius: \`\${tokens.radius.lg}px\` }} — because a bare number is multiplied by the theme's base radius. Use tokens.shadow.card for elevation shadows.
- The GraphQL API is mocked by MSW. Use the operations exported from "@/graphql/queries"; do not invent new GraphQL operations unless a task explicitly asks for one.
- Import only what you use — an unused import or variable is a compile error (TS6133).
- Material UI v6: use the legacy Grid API — <Grid container spacing={2}> with <Grid item xs={12} sm={6} md={4}>. The size={{...}} prop syntax does not exist on this version's Grid — never use it.
- src/main.tsx already wraps <App/> in ApolloProvider, ThemeProvider and CssBaseline. Never add these providers inside App.tsx or any component.
- Tests use Testing Library + Apollo's MockedProvider, following the example test shown in context.
- Code must compile under strict TypeScript. Handle loading and error states for every query.
- Never use the "any" type. Never leave TODO comments or placeholder logic.`;

export function planPrompt(spec: string, pack: ContextPack): string {
  return `<spec>
${spec}
</spec>

<context>
${renderContext(pack, [
  "src/types.ts",
  "src/graphql/queries.ts",
  "src/mocks/handlers.ts",
  "src/theme.ts",
  "src/App.tsx",
  "src/components/Example.tsx",
])}
</context>

<instructions>
Decompose the spec into an ordered list of implementation tasks for this codebase. Each task creates or modifies exactly one file.

Rules:
- Cover every feature in the spec, including test files (they live in src/__tests__/).
- Hooks and shared utilities come before the components that use them; components come before the screens composing them; "modify src/App.tsx" is the last implementation task, followed only by test tasks.
- dependsOn lists the ids of tasks whose files this task imports.
- 8 to 20 tasks. File paths must start with src/ — the only other writable files are index.html, vite.config.ts, vitest.config.ts, tsconfig.json. Never plan changes to package.json; dependencies are fixed.
- Any file containing JSX must use the .tsx extension (this includes hook tests that wrap renderHook in <MockedProvider>). Non-JSX modules use .ts.
</instructions>

<output_format>
Respond with ONLY a JSON array (optionally inside a \`\`\`json fence). Each element has exactly these keys:
{"id": "t1", "file": "src/hooks/useSomething.ts", "action": "create", "description": "what to build, 1-3 sentences", "dependsOn": []}
</output_format>`;
}

export function generatePrompt(
  spec: string,
  task: PlanTask,
  depFiles: Record<string, string>,
  pack: ContextPack,
  allTasks: PlanTask[]
): string {
  const current = depFiles[task.file];
  const deps = Object.entries(depFiles)
    .filter(([p]) => p !== task.file)
    .map(([p, c]) => `<file path="${p}">\n${c}\n</file>`)
    .join("\n\n");
  return `<spec>
${spec}
</spec>

<context>
${renderContext(pack, [
  "src/types.ts",
  "src/graphql/queries.ts",
  "src/theme.ts",
  "src/components/Example.tsx",
  "src/__tests__/Example.test.tsx",
])}
</context>

<plan>
${allTasks.map((t) => `${t.id}: ${t.action} ${t.file} — ${t.description}`).join("\n")}
</plan>

<already_generated_dependencies>
${deps || "(none)"}
</already_generated_dependencies>

${current !== undefined ? `<current_file path="${task.file}">\n${current}\n</current_file>\n\n` : ""}<task>
${task.action === "create" ? "Create" : "Rewrite"} the file ${task.file}.
${task.description}
</task>

<output_format>
Respond with ONLY the complete content of ${task.file} in a single fenced code block. No explanation before or after the block.
</output_format>`;
}

export const REPAIR_SYSTEM_PROMPT = `${SYSTEM_PROMPT}

You are now in repair mode. The generated app fails validation. Use the provided tools to inspect and fix the code, then re-run the failing check.

Method:
1. Read the error output carefully and identify the file and root cause.
2. Use read_file on the relevant file(s) before editing — never guess at current content.
3. Use write_file with the corrected COMPLETE file content (no diffs, no fragments).
4. Re-run run_typecheck / run_tests to confirm the fix.
- Never modify package.json or add dependencies; the toolchain is fixed and nothing new can be installed.
- Never delete tests, skip them, or weaken assertions to make them pass. Fix the implementation.
Fix root causes, not symptoms. Keep changes minimal. When everything passes, reply with a short summary instead of calling more tools.`;

export function repairUserPrompt(failedStep: string, output: string): string {
  return `Validation failed at step "${failedStep}". Output (tail):

${output}

Fix the project so typecheck and tests pass.`;
}

export function regenerateFilePrompt(
  file: string,
  currentContent: string,
  errorOutput: string
): string {
  return `The file ${file} causes validation errors.

<current_file path="${file}">
${currentContent}
</current_file>

<errors>
${errorOutput}
</errors>

Respond with ONLY the corrected complete content of ${file} in a single fenced code block.`;
}
