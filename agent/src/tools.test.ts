import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { executeTool } from "./tools";

const appDir = path.join(os.tmpdir(), "repair-tools-app");

test("executeTool returns ERROR strings instead of throwing", () => {
  assert.match(executeTool(appDir, "read_file", '{"path":"../outside"}'), /^ERROR: .+escapes/);
  assert.match(executeTool(appDir, "read_file", "not json"), /^ERROR: tool arguments/);
  assert.match(executeTool(appDir, "nope", "{}"), /^ERROR: unknown tool/);
});

test("executeTool write_file refuses paths outside the writable set", () => {
  assert.match(executeTool(appDir, "write_file", '{"path":"package.json","content":"{}"}'), /not writable/);
  assert.match(executeTool(appDir, "write_file", '{"path":"node_modules/x.js","content":""}'), /not writable/);
});
