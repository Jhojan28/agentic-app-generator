import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePlan } from "./plan-schema";

const good = [
  { id: "t1", file: "src/hooks/useThing.ts", action: "create", description: "hook", dependsOn: [] },
  { id: "t2", file: "src/App.tsx", action: "modify", description: "wire up", dependsOn: ["t1"] },
];

test("accepts a valid plan", () => {
  const tasks = validatePlan(good);
  assert.equal(tasks.length, 2);
  assert.equal(tasks[0]?.id, "t1");
});

test("rejects non-arrays", () => {
  assert.throws(() => validatePlan({ tasks: [] }), /array/);
});

test("rejects duplicate ids", () => {
  assert.throws(() => validatePlan([good[0], good[0]]), /Duplicate/);
});

test("rejects paths escaping the project", () => {
  assert.throws(
    () => validatePlan([{ ...good[0], file: "../evil.ts" }]),
    /not writable/
  );
  assert.throws(
    () => validatePlan([{ ...good[0], file: "/etc/passwd" }]),
    /not writable/
  );
});

test("rejects unknown dependency ids", () => {
  assert.throws(
    () => validatePlan([{ ...good[0], dependsOn: ["missing"] }]),
    /unknown task/
  );
});

test("rejects bad actions", () => {
  assert.throws(() => validatePlan([{ ...good[0], action: "delete" }]), /action/);
});

test("rejects directory-shaped and whitespace-padded paths", () => {
  assert.throws(() => validatePlan([{ ...good[0], file: "src/" }]), /not writable/);
  assert.throws(() => validatePlan([{ ...good[0], file: "src/components/" }]), /not writable/);
  assert.throws(() => validatePlan([{ ...good[0], file: "src/App.tsx " }]), /not writable/);
  assert.throws(() => validatePlan([{ ...good[0], file: "src/App.tsx\n" }]), /not writable/);
});

test("allows whitelisted root files and rejects others", () => {
  const rootTask = { ...good[0], file: "index.html" };
  assert.equal(validatePlan([rootTask])[0]?.file, "index.html");
  assert.throws(() => validatePlan([{ ...good[0], file: "package.json" }]), /not writable/);
});
