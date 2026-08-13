import { test } from "node:test";
import assert from "node:assert/strict";
import { compressOlderToolResults } from "./repair";
import type { ChatMessage } from "../llm";

function toolMsg(id: string, size: number): ChatMessage {
  return { role: "tool", tool_call_id: id, content: "x".repeat(size) };
}

test("compressOlderToolResults stubs all but the most recent results", () => {
  const messages: ChatMessage[] = [
    { role: "system", content: "s" },
    toolMsg("1", 3000),
    { role: "assistant", content: "a" },
    toolMsg("2", 3000),
    toolMsg("3", 3000),
  ];
  compressOlderToolResults(messages, 2);
  assert.match(messages[1]?.content ?? "", /older result truncated/);
  assert.equal(messages[3]?.content?.length, 3000);
  assert.equal(messages[4]?.content?.length, 3000);
  assert.equal(messages[0]?.content, "s");
});

test("compressOlderToolResults leaves short results alone", () => {
  const messages: ChatMessage[] = [toolMsg("1", 100), toolMsg("2", 100), toolMsg("3", 100)];
  compressOlderToolResults(messages, 2);
  assert.equal(messages[0]?.content?.length, 100);
});
