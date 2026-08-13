import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJson, extractCodeBlock } from "./extract";

test("extractJson parses raw JSON", () => {
  assert.deepEqual(extractJson('[{"a":1}]'), [{ a: 1 }]);
});

test("extractJson parses a ```json fence surrounded by prose", () => {
  const text = 'Here is the plan:\n```json\n[{"id":"t1"}]\n```\nDone.';
  assert.deepEqual(extractJson(text), [{ id: "t1" }]);
});

test("extractJson recovers a bare array embedded in prose", () => {
  assert.deepEqual(extractJson("Sure! [1, 2, 3] — that is all."), [1, 2, 3]);
});

test("extractJson throws on garbage", () => {
  assert.throws(() => extractJson("no json here"), /no parseable JSON/);
});

test("extractCodeBlock takes the largest fenced block", () => {
  const text =
    "```ts\nconst a = 1;\n```\nand\n```tsx\nexport default function App() { return null; }\n```";
  assert.equal(extractCodeBlock(text), "export default function App() { return null; }\n");
});

test("extractCodeBlock falls back to raw text when no fence exists", () => {
  assert.equal(extractCodeBlock("export const x = 1;"), "export const x = 1;\n");
});

test("extractCodeBlock throws on empty response", () => {
  assert.throws(() => extractCodeBlock("   "), /no code/);
});

test("extractCodeBlock handles fences with info strings (e.g. filename)", () => {
  const text = "```tsx src/App.tsx\nexport default function App() { return null; }\n```";
  assert.equal(extractCodeBlock(text), "export default function App() { return null; }\n");
});

test("extractCodeBlock salvages an unclosed (truncated) fence", () => {
  const text = "Here you go:\n```tsx\nexport default function App() { return null; }";
  assert.equal(extractCodeBlock(text), "export default function App() { return null; }\n");
});

test("extractCodeBlock ignores empty fences", () => {
  assert.throws(() => extractCodeBlock("```ts\n\n```"), /no code/);
});

test("extractCodeBlock preserves inner indentation and blank lines", () => {
  const body = "function a() {\n  return 1;\n}\n\nexport default a;";
  assert.equal(extractCodeBlock("```ts\n" + body + "\n```"), body + "\n");
});

test("extractJson prefers the last parseable fence (draft-then-answer responses)", () => {
  const text = '```json\n{"draft":true}\n```\nFinal answer:\n```json\n[{"id":"t1"}]\n```';
  assert.deepEqual(extractJson(text), [{ id: "t1" }]);
});
