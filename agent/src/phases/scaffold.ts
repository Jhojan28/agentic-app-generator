import fs from "node:fs";
import path from "node:path";

const EXCLUDED = new Set(["node_modules", "dist", ".git", ".DS_Store"]);

/** Copy the boilerplate into the output dir (fresh each run).
 *  NOTE: resolveSafe (the write-path guard) does not follow symlinks; this is
 *  safe because the boilerplate contains none outside node_modules (excluded
 *  here) and no agent code path can create one. Keep it that way. */
export function scaffold(boilerplateDir: string, outputDir: string): void {
  if (!fs.existsSync(path.join(boilerplateDir, "package.json"))) {
    throw new Error(`Boilerplate not found at ${boilerplateDir}`);
  }
  const absOut = path.resolve(outputDir);
  if (absOut === path.resolve(boilerplateDir)) {
    throw new Error("Output dir must differ from the boilerplate dir");
  }
  if (fs.existsSync(path.join(absOut, ".git"))) {
    throw new Error(`Refusing to overwrite ${absOut}: it contains a .git directory`);
  }
  fs.rmSync(absOut, { recursive: true, force: true });
  fs.cpSync(boilerplateDir, absOut, {
    recursive: true,
    filter: (src) => !EXCLUDED.has(path.basename(src)),
  });
}
