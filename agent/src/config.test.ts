import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseEnvFile, loadDotEnv, buildConfig } from "./config";

test("parses KEY=value lines and ignores comments/blanks", () => {
  const parsed = parseEnvFile("# comment\n\nA=1\nB = two\n");
  assert.deepEqual(parsed, { A: "1", B: "two" });
});

test("strips matching quotes", () => {
  const parsed = parseEnvFile('A="hello world"\nB=\'x\'\n');
  assert.deepEqual(parsed, { A: "hello world", B: "x" });
});

test("strips inline comments from unquoted values, keeps # inside quotes and #-leading values", () => {
  const parsed = parseEnvFile('A=hello # comment\nB="keep # this"\nC=#fff\n');
  assert.deepEqual(parsed, { A: "hello", B: "keep # this", C: "#fff" });
});

test("accepts export-prefixed lines and strips a leading BOM", () => {
  const parsed = parseEnvFile("\uFEFF" + "export A=1\n");
  assert.deepEqual(parsed, { A: "1" });
});

test("loadDotEnv: real env wins; earlier dirs win per key", () => {
  const d1 = fs.mkdtempSync(path.join(os.tmpdir(), "env1-"));
  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), "env2-"));
  fs.writeFileSync(path.join(d1, ".env"), "TEST_CONF_A=one\nTEST_CONF_B=fromd1\n");
  fs.writeFileSync(path.join(d2, ".env"), "TEST_CONF_B=fromd2\nTEST_CONF_C=three\n");
  process.env["TEST_CONF_A"] = "real";
  delete process.env["TEST_CONF_B"];
  delete process.env["TEST_CONF_C"];
  try {
    loadDotEnv([d1, d2]);
    assert.equal(process.env["TEST_CONF_A"], "real");
    assert.equal(process.env["TEST_CONF_B"], "fromd1");
    assert.equal(process.env["TEST_CONF_C"], "three");
  } finally {
    delete process.env["TEST_CONF_A"];
    delete process.env["TEST_CONF_B"];
    delete process.env["TEST_CONF_C"];
  }
});

test("buildConfig rejects a non-numeric or non-positive LLM call cap", () => {
  process.env["LLM_API_KEY"] = "test-key";
  process.env["AGENT_MAX_LLM_CALLS"] = "abc";
  try {
    assert.throws(() => buildConfig({ spec: "s.md", output: "out" }, "/tmp"), /AGENT_MAX_LLM_CALLS/);
    process.env["AGENT_MAX_LLM_CALLS"] = "-5";
    assert.throws(() => buildConfig({ spec: "s.md", output: "out" }, "/tmp"), /AGENT_MAX_LLM_CALLS/);
  } finally {
    delete process.env["LLM_API_KEY"];
    delete process.env["AGENT_MAX_LLM_CALLS"];
  }
});
