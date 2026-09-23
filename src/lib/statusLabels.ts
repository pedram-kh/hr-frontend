// Sprint 11a (§D.3) — shared human-status label maps, alongside
// escalationReasons.ts's existing pattern (Correction-02). Each map covers
// one small, closed enum; each is guard-tested on the backend
// (`*LabelCoverageTest`, extended in this sprint) against the real source of
// truth (a DB CHECK constraint or a `Rule::in([...])` array), never a
// hand-copied list left to drift.
//
// Sprint 11b (plan.md §C.9 step 6): the label maps themselves moved into
// `i18n/es.ts`/`en.ts` (`t.statusLabels.*`) so they're locale-aware; these
// functions now take the resolved dictionary `t` as their first argument.
// Coverage against the real backend enums stays guard-tested in
// `statusLabels.test.ts`, against both dictionaries.
import type { Dict } from '../i18n/es';

/** Label for a `reason.sub_outcome` pair; falls back to the raw sub_outcome for anything unmapped. */
export function subOutcomeLabel(t: Dict, reason: string | null | undefined, subOutcome: string | null | undefined): string {
  if (!subOutcome) return t.common.dash;
  const key = `${reason ?? ''}.${subOutcome}`;
  return t.statusLabels.subOutcome[key] ?? subOutcome;
}

// --- GroupsQueue.tsx fact/node status (§D.2) --------------------------------
export function factStatusLabel(t: Dict, status: string | null | undefined): string {
  if (!status) return t.common.dash;
  return t.statusLabels.factStatus[status] ?? status;
}

// Node status covers both the top-level and child-node badges in
// GroupsQueue.tsx (same 3-value enum, same ConvenioGroup::STATUSES source).
export function groupNodeStatusLabel(t: Dict, status: string | null | undefined): string {
  if (!status) return t.common.dash;
  return t.statusLabels.groupNodeStatus[status] ?? status;
}

// --- Documents: retrieval_status / tagging_status (§D.2) --------------------
// Enum per `documents`/`document_chunks` migrations (`retrieval_status`):
// draft | active | historical.
export function retrievalStatusLabel(t: Dict, status: string | null | undefined): string {
  if (!status) return t.common.dash;
  return t.statusLabels.retrievalStatus[status] ?? status;
}

export function taggingStatusLabel(t: Dict, status: string | null | undefined): string {
  if (!status) return t.common.dash;
  return t.statusLabels.taggingStatus[status] ?? status;
}
