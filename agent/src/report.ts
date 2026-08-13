/** $ per million tokens; extend as needed. Unknown models report null. */
const PRICES_PER_MTOK: Array<{ match: string; input: number; output: number }> = [
  { match: "claude-opus-5", input: 5, output: 25 },
  { match: "claude-sonnet-5", input: 3, output: 15 },
  { match: "claude-haiku-4-5", input: 1, output: 5 },
];

export class UsageTracker {
  promptTokens = 0;
  completionTokens = 0;
  calls = 0;

  add(promptTokens: number, completionTokens: number): void {
    this.promptTokens += promptTokens;
    this.completionTokens += completionTokens;
    this.calls += 1;
  }

  estimatedCostUsd(model: string): number | null {
    const price = PRICES_PER_MTOK.find((p) => model.includes(p.match));
    if (!price) return null;
    return (
      (this.promptTokens / 1e6) * price.input +
      (this.completionTokens / 1e6) * price.output
    );
  }
}

export function printReport(
  tracker: UsageTracker,
  model: string,
  filesWritten: string[],
  validationOk: boolean,
  repairRounds: number
): void {
  const cost = tracker.estimatedCostUsd(model);
  console.log("\n================ AGENT RUN REPORT ================");
  console.log(`Model:          ${model}`);
  console.log(`LLM calls:      ${tracker.calls}`);
  console.log(`Tokens:         ${tracker.promptTokens} in / ${tracker.completionTokens} out`);
  console.log(
    `Estimated cost: ${cost === null ? "n/a (no price data for this model)" : `$${cost.toFixed(4)}`}`
  );
  console.log(`Files written:  ${filesWritten.length}`);
  console.log(`Repair rounds:  ${repairRounds}`);
  console.log(`Validation:     ${validationOk ? "PASS (typecheck + tests)" : "FAIL — see output above"}`);
  console.log("==================================================\n");
}
