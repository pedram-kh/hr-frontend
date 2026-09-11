// Sprint 10a — Correction-01 (E1). `[Fuente N]` markers are a STORAGE/grounding
// concern, not an employee-presentation one: hr-ai writes them into the
// synthesised answer 1:1 with the FUENTES list (§7), and hr-backend's Check B
// re-parses them (indirectly, via the structured `citations` it already
// validated) against `chat_messages.content`. Stripping them at the source
// (storage) or in the API response would break that contract for every
// consumer of the stored/returned text — including the admin surfaces, which
// are SUPPOSED to show the raw markers alongside the FUENTES list so the
// marker↔source mapping is inspectable.
//
// So this is a display-only transform, applied ONLY where the employee reads
// the text back (never touching what is stored or returned by the API, and
// never applied on admin surfaces, which render `chat_messages.content`
// directly via CitationList/TracePanel's shared components).
//
// Mirrors hr-ai's own marker regex exactly (`app/providers/claude.py`,
// `_renumber_markers`: `r"\[Fuente\s+(\d+)\]"`) so this recognises precisely
// the markers hr-ai can ever emit — nothing more, nothing less.
const SOURCE_MARKER_RE = /\[Fuente\s+\d+\]/g;

/**
 * Remove `[Fuente N]` markers from employee-facing prose for display, and tidy
 * the whitespace/punctuation a removed marker leaves behind (double spaces, a
 * stray space before a comma/period) — the same tidy-up hr-ai's own renumberer
 * does after removing an unmapped marker.
 */
export function stripSourceMarkers(text: string): string {
  return text
    .replace(SOURCE_MARKER_RE, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([,.;:])/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}
