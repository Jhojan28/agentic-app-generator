import { test } from "node:test";
import assert from "node:assert/strict";
import { extractMessage, backoffMs } from "./llm";

test("extractMessage returns a normalized assistant message, dropping provider extras", () => {
  const msg = extractMessage({
    choices: [{ message: { role: "assistant", content: "hi", reasoning: "internal" } }],
  });
  assert.deepEqual(msg, { role: "assistant", content: "hi" });
});

test("extractMessage keeps tool_calls", () => {
  const tc = [{ id: "1", type: "function", function: { name: "f", arguments: "{}" } }];
  const msg = extractMessage({
    choices: [{ message: { role: "assistant", content: null, tool_calls: tc, annotations: [] } }],
  });
  assert.deepEqual(msg, { role: "assistant", content: null, tool_calls: tc });
});

test("extractMessage throws with the body on error-shaped 200s", () => {
  assert.throws(
    () => extractMessage({ error: { message: "upstream down" } }),
    /no choices[\s\S]*upstream down/
  );
});

test("extractMessage flags truncated responses", () => {
  assert.throws(
    () =>
      extractMessage({
        choices: [{ message: { role: "assistant", content: "half a file" }, finish_reason: "length" }],
      }),
    /truncated/
  );
});

test("backoffMs honors retry-after, caps at 60s, falls back to exponential", () => {
  assert.equal(backoffMs(1, "30"), 30_000);
  assert.equal(backoffMs(1, "999"), 60_000);
  assert.equal(backoffMs(2, null), 4000);
  assert.equal(backoffMs(3, "garbage"), 8000);
});
