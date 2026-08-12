# Agentic App Generator — Design Spec

**Date:** 2026-08-12
**Status:** Approved by user (pre-implementation)
**Context:** Senior Full Stack Engineer take-home — build an agentic workflow that reads a natural-language spec and autonomously generates a working React + TypeScript app into a provided boilerplate.

## 1. Goal

A CLI tool (`agent/`) that:

1. Accepts a natural-language spec file (`--spec`) and an output directory (`--output`).
2. Plans the implementation as ordered, dependency-aware tasks.
3. Generates code file-by-file into a copy of the provided boilerplate.
4. Self-validates (`npm run typecheck` + `npm run test`) and repairs failures via a bounded tool-calling loop (≥1 retry).
5. Outputs a runnable project: `cd generated-app && npm install && npm run dev`.

The deliverable being evaluated is the **agent**, not the car app. Evaluators will run the agent with their own API keys and may modify the spec — nothing app-specific may live in the prompts.

## 2. Key decisions

| Decision | Choice | Why |
|---|---|---|
| Agent language | TypeScript CLI | Matches stack; "clean, typed" is an evaluation criterion |
| TS runtime | `tsx` (single devDependency) | Node 22.18+ strips types natively, but evaluators may run older Node; tsx removes the risk |
| LLM layer | Provider-agnostic, raw `fetch`, OpenAI-compatible chat completions wire format (incl. tool calls) | User requirement: evaluators use whatever provider they want; zero npm packages for the LLM layer |
| Provider config | `LLM_BASE_URL` + `LLM_API_KEY` + `LLM_MODEL` env vars | Works with Anthropic (OpenAI-compat endpoint), Groq free tier, OpenAI, Gemini, OpenRouter |
| Default model | `claude-opus-5` in `.env.example`, commented presets for alternatives | Strongest codegen; the user will test with Claude and Groq free tier |
| Architecture | Hybrid: deterministic pipeline (Plan → Scaffold → Generate → Validate) + bounded LLM tool-calling loop for Repair | Determinism where reliability matters; genuine function-calling where it shines (surgical fixes) — covers every rubric row |
| Agent framework | None (hand-rolled) | Challenge explicitly warns against over-engineered frameworks; the loop design is what's evaluated |
| Design system | MUI theme tokens (`theme.ts` in boilerplate) — **no Tailwind** | Spec explicitly requires "Material UI cards"; zero new packages; honors user's minimal-dependency goal |
| Git identity | `jhojanestiven1996@gmail.com` / Jhojan Garcia | Owner of the GitHub account; repo name: `agentic-app-generator` |

## 3. Repo layout

```
agentic-app-generator/
├── agent/                   # the CLI agent (TypeScript)
│   ├── src/
│   │   ├── index.ts         # CLI entry: --spec <file> --output <dir>
│   │   ├── llm.ts           # provider-agnostic client (fetch, retries, usage accounting)
│   │   ├── phases/          # plan.ts, generate.ts, validate.ts, repair.ts
│   │   ├── tools.ts         # tool definitions + executors for the repair loop
│   │   ├── prompts.ts       # all prompt templates in one place
│   │   ├── context.ts       # builds the boilerplate "context pack" per phase
│   │   └── report.ts        # token + cost accounting
│   └── package.json         # tsx devDependency only
├── boilerplate/             # provided boilerplate + mini design system (theme.ts)
├── specs/sample-spec.md     # sample natural-language spec (the agent's input)
├── generated-app/           # committed sample output (a verified run)
├── docs/superpowers/specs/  # design docs
├── .env.example
└── README.md                # setup, architecture diagram, decisions, cost per run
```

## 4. Pipeline

1. **PLAN** — one LLM call: spec + context pack (file tree, `types.ts`, `queries.ts`, theme tokens, `Example.tsx` as few-shot) → strict JSON task list `{id, file, action: create|modify, description, dependsOn[]}`. Schema-validated, topologically sorted; one re-prompt on invalid JSON.
2. **SCAFFOLD** — copy `boilerplate/` → output dir (pure fs, no LLM).
3. **GENERATE** — per task in dependency order: prompt = spec + task + declared dependency files (already generated) + only the relevant boilerplate files. Context management: bounded tokens per call, never a full-repo dump. Output contract: exactly one fenced code block → written to disk.
4. **VALIDATE** — `npm install` (once), `npm run typecheck`, `npm run test` in the output dir via `child_process`; capture stdout/stderr.
5. **REPAIR** — bounded tool-calling loop: LLM receives error output and tools `read_file`, `write_file`, `run_typecheck`, `run_tests`; drives its own fix. Caps: ~3 repair rounds / ~10 tool iterations global. Fallback for weak models: if no valid tool call is emitted, regenerate the failing file whole. If budget exhausts, report honestly.
6. **REPORT** — files written, retries used, tokens in/out, estimated cost (per-model price table), final validation status.

## 5. Prompt design

- Delimited sections: `<spec>`, `<context>`, `<task>`, `<output_format>`.
- Few-shot from the boilerplate's `Example.tsx` / `Example.test.tsx` (Apollo + MUI + MockedProvider patterns).
- Explicit output contracts (single fenced block; strict JSON schema for the plan).
- **Anti-memorization:** no car/app-domain knowledge in any prompt — all domain content comes from the spec file.

## 6. Mini design system

Add `src/theme.ts` to the boilerplate: palette, typography scale, spacing, radii + MUI component overrides (Card, Button, TextField), wired into `main.tsx`. Generation prompts instruct components to consume theme tokens rather than hardcode styles. Zero new packages (challenge allows boilerplate enhancement).

## 7. Error handling

- LLM API errors → retry with exponential backoff (429/5xx).
- Malformed LLM output (invalid JSON / missing code block) → one re-prompt including the error.
- Validation failures → repair loop (above).
- Global token/cost budget guard aborts runaway runs with a clear message.
- npm/tooling failures surface loudly with captured output.

## 8. Testing

- **Generated app:** the plan always includes test tasks — hook test + key component tests using the MockedProvider pattern (satisfies "acceptable level of testing").
- **Agent code:** kept simple and typed; correctness demonstrated by the committed sample run. (Unit tests for pure utils are a stretch goal within the 4–6h budget.)

## 9. Sample spec

`specs/sample-spec.md` describes the Car Inventory Manager in natural language: the 3 required features (car list via Apollo/MSW `GetCars`, search by model + sort by year/make, tests) plus optional ones (useCars hook, responsive images by viewport, MUI cards, AddCar mutation form, useCarFilters). This is the input evaluators run and may mutate.

## 10. Assumptions (documented for the README)

- **PDF vs repo README discrepancy:** the PDF marks only 3 features required (others optional); the repo README marks all 7 required, and deadlines differ (3 vs 5 business days). We treat the PDF as authoritative but build the agent + sample spec to cover all features, so either reading is satisfied.
- Anthropic is reachable through its OpenAI-compatible endpoint for chat completions + tool calls; any OpenAI-compatible provider works unchanged.
- Evaluators supply their own `LLM_API_KEY` (per challenge instructions); `.env.example` documents all three variables with provider presets.
- No real backend, no databases, no auth/CI/CD (explicitly out of scope per the challenge).

## 11. Process requirements

- Small, meaningful commits telling the story (design → boilerplate import → LLM client → each phase → sample run → README).
- README includes: setup, architecture diagram, LLM choice rationale, tradeoffs, what to improve with more time, approximate cost per run.
