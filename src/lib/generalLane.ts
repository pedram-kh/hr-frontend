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

// Slice 13c (plan.md §2.5) — the caveat for a `basis = model_knowledge` lane answer (no page was consulted).
// Mirrors `ChatService::GENERAL_LANE_MODEL_CAVEAT` exactly, same hand-copy trade-off as above.
const GENERAL_LANE_MODEL_CAVEAT =
  '\n\nInformación general, redactada sin consultar tu convenio ni la normativa cargada y sin una fuente verificable. ' +
  'No describe lo que se te aplica a ti: consúltalo en tu convenio o con Recursos Humanos.';

/** Where a lane answer came from: a fetched official page, or the model's own knowledge. */
export type GeneralLaneBasis = 'web' | 'model_knowledge';

/**
 * The basis the backend declared on the employee payload (`general_lane.basis`, present only on a lane answer). A lane
 * answer without one (a turn persisted before Slice 13c) is a web answer.
 */
export function generalLaneBasis(general: { basis?: string } | undefined): GeneralLaneBasis {
  return general?.basis === 'model_knowledge' ? 'model_knowledge' : 'web';
}

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
  for (const caveat of [GENERAL_LANE_MODEL_CAVEAT, GENERAL_LANE_CAVEAT]) {
    if (text.endsWith(caveat)) return text.slice(0, -caveat.length).trimEnd();
  }
  return text;
}
