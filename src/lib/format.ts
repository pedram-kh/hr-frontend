// Sprint 7g Item 2 — shared display helper: the Reference-facts queue and the
// Groups tab's fact lists both need to show a fact's `source_excerpt` inline
// (so a reviewer can identify/sanity-check it without opening the fact), but
// an excerpt can run to several sentences — only the first line belongs in a
// table cell.
export function firstLine(text: string | null | undefined, maxLen = 120): string | null {
  if (!text) return null;
  const line = text.split(/\r?\n/)[0].trim();
  if (line === '') return null;
  return line.length > maxLen ? `${line.slice(0, maxLen - 1)}…` : line;
}
