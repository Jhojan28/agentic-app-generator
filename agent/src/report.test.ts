import { test } from "node:test";
import assert from "node:assert/strict";
import { UsageTracker } from "./report";

test("accumulates tokens and call count", () => {
  const t = new UsageTracker();
  t.add(100, 50);
  t.add(200, 25);
  assert.equal(t.promptTokens, 300);
  assert.equal(t.completionTokens, 75);
  assert.equal(t.calls, 2);
});

test("estimates cost for known models ($/MTok)", () => {
  const t = new UsageTracker();
  t.add(1_000_000, 1_000_000);
  // claude-opus-5: $5 in + $25 out per MTok
  assert.equal(t.estimatedCostUsd("claude-opus-5"), 30);
});

test("returns null for unknown models", () => {
  const t = new UsageTracker();
  t.add(1000, 1000);
  assert.equal(t.estimatedCostUsd("llama-3.3-70b-versatile"), null);
});
