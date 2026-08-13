import { test } from "node:test";
import assert from "node:assert/strict";
import { runStep } from "./validate";

test("runStep captures exit status and both output streams", () => {
  const res = runStep(process.cwd(), "node", [
    "-e",
    "console.log('out'); console.error('err'); process.exit(3)",
  ]);
  assert.equal(res.ok, false);
  assert.match(res.output, /out/);
  assert.match(res.output, /err/);
});

test("runStep surfaces spawn errors instead of returning empty output", () => {
  const res = runStep(process.cwd(), "definitely-not-a-real-cmd-xyz", []);
  assert.equal(res.ok, false);
  assert.match(res.output, /spawn/);
});

test("runStep keeps both head and tail of long output", () => {
  const res = runStep(process.cwd(), "node", [
    "-e",
    "const s = 'A'.repeat(4000) + 'B'.repeat(4000); console.log('FIRST' + s + 'LAST')",
  ]);
  assert.equal(res.ok, true);
  assert.match(res.output, /FIRST/);
  assert.match(res.output, /LAST/);
  assert.match(res.output, /truncated/);
});
