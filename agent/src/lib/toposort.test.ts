import { test } from "node:test";
import assert from "node:assert/strict";
import { topoSort } from "./toposort";
import type { PlanTask } from "../types";

function task(id: string, dependsOn: string[]): PlanTask {
  return { id, file: `src/${id}.ts`, action: "create", description: id, dependsOn };
}

test("orders dependencies before dependents", () => {
  const sorted = topoSort([task("c", ["b"]), task("a", []), task("b", ["a"])]);
  assert.deepEqual(
    sorted.map((t) => t.id),
    ["a", "b", "c"]
  );
});

test("keeps every task exactly once", () => {
  const sorted = topoSort([task("a", []), task("b", ["a"]), task("c", ["a"])]);
  assert.equal(sorted.length, 3);
  assert.equal(new Set(sorted.map((t) => t.id)).size, 3);
});

test("throws on dependency cycles", () => {
  assert.throws(() => topoSort([task("a", ["b"]), task("b", ["a"])]), /cycle/);
});

test("throws on unknown dependency ids", () => {
  assert.throws(() => topoSort([task("a", ["ghost"])]), /Unknown task id/);
});
