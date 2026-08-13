/** Parse JSON out of an LLM response: raw, fenced, or embedded in prose.
 *  Callers MUST validate the shape of the result — bracket-slice recovery
 *  can return an inner object instead of the outer array. */
export function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    /* fall through */
  }
  const fences = [...text.matchAll(/```[^\n]*\r?\n([\s\S]*?)```/g)].map(
    (m) => m[1] ?? ""
  );
  for (const body of fences.reverse()) {
    try {
      return JSON.parse(body);
    } catch {
      /* try next */
    }
  }
  for (const [open, close] of [
    ["[", "]"],
    ["{", "}"],
  ] as const) {
    const start = text.indexOf(open);
    const end = text.lastIndexOf(close);
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
  }
  throw new Error("Response contains no parseable JSON");
}

/** Extract file content from an LLM response: largest closed fence, else
 *  salvage after an unclosed fence, else raw text. Throws only when there
 *  is genuinely nothing — garbage on disk gets repair rounds, an abort
 *  mid-generation does not. */
export function extractCodeBlock(text: string): string {
  const fences = [...text.matchAll(/```[^\n]*\r?\n([\s\S]*?)```/g)]
    .map((m) => (m[1] ?? "").trim())
    .filter((s) => s.length > 0);
  if (fences.length > 0) {
    return fences.reduce((a, b) => (b.length > a.length ? b : a)) + "\n";
  }
  // No usable closed fence: salvage anything after an unclosed opening fence.
  const open = text.match(/```[^\n]*\r?\n([\s\S]*)$/);
  const candidate = (open?.[1] ?? text).replace(/```\s*$/, "").trim();
  if (candidate.length === 0) throw new Error("Response contains no code");
  return candidate + "\n";
}
