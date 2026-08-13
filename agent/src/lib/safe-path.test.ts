import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { resolveSafe } from "./safe-path";

const root = path.join(os.tmpdir(), "agent-safe-path-root");

test("resolves paths inside the root", () => {
  const resolved = resolveSafe(root, "src/App.tsx");
  assert.equal(resolved, path.join(root, "src", "App.tsx"));
});

test("rejects .. traversal", () => {
  assert.throws(() => resolveSafe(root, "../outside.txt"), /escapes/);
});

test("rejects absolute paths outside the root", () => {
  assert.throws(() => resolveSafe(root, "/etc/passwd"), /escapes/);
});
