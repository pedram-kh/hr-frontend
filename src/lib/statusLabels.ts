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

// --- Analítica chart labels (Sprint 12b item 6, plan.md §4.4) ----------------
// `path` (floor_decision.path), the `authority_used` atoms and the TopicLexicon
// keys reach the Analítica bar charts as internal snake_case values. Unlike the
// helpers above (which return the raw value for an unmapped key), these fall
// back to a HUMANISED string, so a value added on the backend tomorrow can
// never show `snake_case` on screen, and warn in dev so it gets a real label.

/** `reference_fact_composition` → `Reference fact composition`. Never contains `_`. */
export function humanizeKey(key: string): string {
  const spaced = key.replace(/[_\s]+/g, ' ').trim();
  return spaced === '' ? key : spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function labelOrHumanized(map: Record<string, string>, kind: string, key: string): string {
  const hit = map[key];
  if (hit !== undefined) return hit;
  if (import.meta.env.DEV) console.warn(`analyticsLabels.${kind}: no label for "${key}" — add one to es.ts and en.ts`);
  return humanizeKey(key);
}

export function analyticsPathLabel(t: Dict, key: string): string {
  return labelOrHumanized(t.analyticsLabels.path, 'path', key);
}

/** `authority_used_key` is the sorted atoms joined with `+` (DeflectionAnalytics::authorityKey), or `none`. */
export function analyticsAuthorityLabel(t: Dict, key: string): string {
  return key
    .split('+')
    .map((atom) => labelOrHumanized(t.analyticsLabels.authority, 'authority', atom))
    .join(' + ');
}

export function analyticsTopicLabel(t: Dict, key: string): string {
  return labelOrHumanized(t.analyticsLabels.topic, 'topic', key);
}
