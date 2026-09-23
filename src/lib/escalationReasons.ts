// Correction-02 (CP-4 step 6, C2-1): single shared source of truth for the
// `escalation_cards.reason` → human label mapping on the frontend. Before
// this, the board filter (`EscalationBoardPage.tsx`) and the History filter
// (`HistoryPage.tsx`) each carried their OWN hand-copied array, and Analítica
// (`AnalyticsPage.tsx`) rendered the raw `reason` string with no label at
// all — three independent places that could (and did) drift out of sync with
// the backend's own `EscalationController::REASON_LABELS` and with each
// other as the enum grew. One list now, imported everywhere a reason
// renders, so a future enum addition only needs one new line in
// `i18n/es.ts`/`en.ts` under `escalationReasons.labels` (plus the backend's
// own `REASON_LABELS`, which is what actually drives the board's per-card
// badge via `reason_label` — this file backs the filter dropdowns and
// Analítica, which have no server-computed label of their own).
//
// Sprint 11b (plan.md §C.9 step 8b): labels moved into the locale dictionaries
// (`t.escalationReasons.*`) so they're locale-aware; these helpers now take
// the resolved dictionary `t` as their first argument — same posture as
// `statusLabels.ts`.
import type { Dict } from '../i18n/es';

/** Closed set of reason ids — order matches the filter dropdown / backend enum. */
export const ESCALATION_REASON_IDS = [
  'low_confidence',
  'off_domain',
  'sensitive_topic',
  'explicit_request',
  'salary_coverage_gap',
  'salary_not_in_chat',
  'reference_fact_coverage_gap',
  'estatuto_fallback_gap',
  'conflict',
  'quality_sample_wrong',
] as const;

/** Filter-dropdown options: "Todos los motivos" + one row per known reason. */
export function escalationReasonFilters(t: Dict): Array<{ id: string; label: string }> {
  return [
    { id: '', label: t.escalationReasons.allReasons },
    ...ESCALATION_REASON_IDS.map((id) => ({
      id,
      label: t.escalationReasons.labels[id] ?? id,
    })),
  ];
}

/** Label for a reason value; falls back to the raw string for anything unmapped. */
export function escalationReasonLabel(t: Dict, reason: string | null | undefined): string {
  if (reason === null || reason === undefined || reason === '') {
    return t.common.dash;
  }
  return t.escalationReasons.labels[reason] ?? reason;
}
