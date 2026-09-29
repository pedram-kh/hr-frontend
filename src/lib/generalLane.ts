// Sprint 13, build step 9 (plan.md §B.6.6) — the `general_knowledge`-lane
// badge sentence (`ChatService::GENERAL_LANE_CAVEAT`, hr-backend) is appended
// to the STORED/RETURNED answer text verbatim, same placement/reasoning as
// `FALLBACK_CAVEAT` (see `citationMarkers.ts`'s own docblock for why this
// display-only-transform pattern exists at all: the stored text must keep the
// sentence for the audit trail; only the EMPLOYEE-facing bubble strips it and
// renders a badge instead).
//
// Mirrors `ChatService::GENERAL_LANE_CAVEAT` exactly — hand-copied, not
// imported (hr-backend and hr-frontend are separate repos, same trade-off
// `protectedStrings.test.ts` documents for its own backend-sourced fixtures).
const GENERAL_LANE_CAVEAT =
  '\n\nInformación general — no procede de tu convenio ni de la normativa cargada.';

/** True when this answer is a `general_knowledge`-lane turn. */
export function isGeneralLaneAnswer(authorityUsed: string[] | undefined): boolean {
  return !!authorityUsed?.includes('general_knowledge');
}

/**
 * Remove the trailing general-lane caveat sentence from employee-facing
 * prose for display — the badge (rendered separately) carries the same
 * meaning without repeating hr-backend's fixed sentence inline.
 */
export function stripGeneralLaneCaveat(text: string): string {
  return text.endsWith(GENERAL_LANE_CAVEAT) ? text.slice(0, -GENERAL_LANE_CAVEAT.length).trimEnd() : text;
}
