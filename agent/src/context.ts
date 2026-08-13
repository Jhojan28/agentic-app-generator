import fs from "node:fs";
import path from "node:path";

/** Boilerplate files worth showing the model (bounded, curated). */
const KEY_FILES = [
  "src/types.ts",
  "src/graphql/queries.ts",
  "src/theme.ts",
  "src/mocks/handlers.ts",
  "src/main.tsx",
  "src/App.tsx",
  "src/components/Example.tsx",
  "src/__tests__/Example.test.tsx",
];

export interface ContextPack {
  tree: string;
  files: Record<string, string>;
}

export function buildContextPack(projectDir: string): ContextPack {
  const files: Record<string, string> = {};
  for (const rel of KEY_FILES) {
    const abs = path.join(projectDir, rel);
    if (fs.existsSync(abs)) files[rel] = fs.readFileSync(abs, "utf8");
  }
  return { tree: listTree(projectDir), files };
}

function listTree(dir: string): string {
  const out: string[] = [];
  walk(dir, "");
  return out.join("\n");

  function walk(abs: string, rel: string): void {
    const entries = fs
      .readdirSync(abs, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (["node_modules", ".git", "dist"].includes(entry.name)) continue;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(abs, entry.name), childRel);
      else out.push(childRel);
    }
  }
}

/** Render the tree plus a selected subset of key files as prompt context. */
export function renderContext(pack: ContextPack, includeFiles: string[]): string {
  const sections = [`<file_tree>\n${pack.tree}\n</file_tree>`];
  for (const rel of includeFiles) {
    const content = pack.files[rel];
    if (content) {
      sections.push(`<file path="${rel}">\n${content}\n</file>`);
    } else {
      console.warn(`[context] include file missing from pack: ${rel}`);
    }
  }
  return sections.join("\n\n");
}
