import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDotEnv, buildConfig } from "./config";
import { UsageTracker, printReport } from "./report";
import { LlmClient } from "./llm";
import { buildContextPack } from "./context";
import { plan } from "./phases/plan";
import { scaffold } from "./phases/scaffold";
import { generate } from "./phases/generate";
import { validate, type ValidationResult } from "./phases/validate";
import { repair } from "./phases/repair";

function usage(): void {
  console.log("Usage: npm run agent -- --spec <spec-file> --output <output-dir>");
}

function fail(message: string): never {
  console.error(`\nERROR: ${message}`);
  process.exit(1);
}

function parseArgs(argv: string[]): { spec: string; output: string } {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const rawArg = argv[i];
    if (!rawArg) continue;
    const eq = rawArg.indexOf("=");
    const flag = eq === -1 ? rawArg : rawArg.slice(0, eq);
    if (flag === "--spec" || flag === "--output") {
      const value = eq === -1 ? argv[++i] : rawArg.slice(eq + 1);
      if (!value) fail(`Missing value for ${flag}`);
      args[flag.slice(2)] = value;
    } else if (flag === "--help" || flag === "-h") {
      usage();
      process.exit(0);
    } else {
      usage();
      fail(`Unknown argument: ${rawArg}`);
    }
  }
  const spec = args["spec"];
  const output = args["output"];
  if (!spec || !output) {
    usage();
    fail("Both --spec and --output are required");
  }
  return { spec, output };
}

async function main(): Promise<void> {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const args = parseArgs(process.argv.slice(2));
  loadDotEnv([repoRoot, process.cwd()]);
  const config = buildConfig(args, repoRoot);
  if (!fs.existsSync(config.specPath)) fail(`Spec file not found: ${config.specPath}`);
  const spec = fs.readFileSync(config.specPath, "utf8");

  console.log("\nAgentic App Generator");
  console.log(`  model:  ${config.model} @ ${config.baseUrl}`);
  console.log(`  spec:   ${config.specPath}`);
  console.log(`  output: ${config.outputDir}\n`);

  const tracker = new UsageTracker();
  const llm = new LlmClient(
    config.baseUrl,
    config.apiKey,
    config.model,
    tracker,
    config.maxLlmCalls,
    config.maxOutputTokens
  );

  console.log("[scaffold] copying boilerplate...");
  scaffold(config.boilerplateDir, config.outputDir);
  const pack = buildContextPack(config.outputDir);

  let written: string[] = [];
  let result: ValidationResult = { ok: false, output: "" };
  let repairRounds = 0;
  try {
    console.log("[plan] decomposing spec into tasks...");
    const tasks = await plan(llm, spec, pack);
    for (const t of tasks) console.log(`  - ${t.id}: ${t.action} ${t.file}`);

    written = await generate(llm, spec, tasks, pack, config.outputDir);

    result = validate(config.outputDir);
    if (!result.ok && result.failedStep === "npm install") {
      console.error(result.output);
      printReport(tracker, config.model, written, false, 0);
      fail("npm install failed in the generated app — an environment problem the repair loop cannot fix.");
    }
    if (!result.ok) {
      console.log(`[validate] FAILED at ${result.failedStep}`);
      const fixed = await repair(llm, config.outputDir, result);
      repairRounds = fixed.rounds;
      if (fixed.ok) result = { ok: true, output: "repaired" };
    }
  } catch (err) {
    // A mid-run abort (budget, provider error) still spent tokens — print the
    // cost report before dying. fail() calls process.exit, so the npm-install
    // branch above never reaches this catch.
    printReport(tracker, config.model, written, false, repairRounds);
    fail((err as Error).message);
  }

  printReport(tracker, config.model, written, result.ok, repairRounds);
  if (result.ok) {
    console.log(
      `Done. Run it:\n  cd ${path.relative(process.cwd(), config.outputDir)} && npm install && npm run dev\n`
    );
  }
  process.exit(result.ok ? 0 : 1);
}

main().catch((err: Error) => fail(err.message));
