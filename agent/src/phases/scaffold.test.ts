import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scaffold } from "./scaffold";

test("copies boilerplate excluding node_modules and refuses git dirs", () => {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), "bp-"));
  fs.writeFileSync(path.join(src, "package.json"), "{}");
  fs.mkdirSync(path.join(src, "node_modules", "x"), { recursive: true });
  fs.mkdirSync(path.join(src, "src"), { recursive: true });
  fs.writeFileSync(path.join(src, "src", "a.ts"), "export {}");
  fs.writeFileSync(path.join(src, ".DS_Store"), "junk");

  const dest = path.join(os.tmpdir(), `out-${Date.now()}`);
  scaffold(src, dest);
  assert.ok(fs.existsSync(path.join(dest, "src", "a.ts")));
  assert.ok(!fs.existsSync(path.join(dest, "node_modules")));
  assert.ok(!fs.existsSync(path.join(dest, ".DS_Store")));

  // refuses to clobber a directory containing .git
  const gitDest = fs.mkdtempSync(path.join(os.tmpdir(), "gitout-"));
  fs.mkdirSync(path.join(gitDest, ".git"));
  assert.throws(() => scaffold(src, gitDest), /\.git/);
});
