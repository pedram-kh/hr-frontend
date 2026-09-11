// Correction-02 (CP-4 step 6, C2-1): single shared source of truth for the
// `escalation_cards.reason` → human label mapping on the frontend. Before
// this, the board filter (`EscalationBoardPage.tsx`) and the History filter
// (`HistoryPage.tsx`) each carried their OWN hand-copied array, and Analítica
// (`AnalyticsPage.tsx`) rendered the raw `reason` string with no label at
// all — three independent places that could (and did) drift out of sync with
// the backend's own `EscalationController::REASON_LABELS` and with each
// other as the enum grew. One list now, imported everywhere a reason
// renders, so a future enum addition only needs one new line here (plus the
// backend's own `REASON_LABELS`, which is what actually drives the board's
// per-card badge via `reason_label` — this file backs the filter dropdowns
// and Analítica, which have no server-computed label of their own).
//
// Keep in sync with `escalation_cards.reason`'s CHECK-constraint enum
// (`hr-backend/database/migrations/*_escalation_cards_reason.php`) and with
// `EscalationController::REASON_LABELS`. `EscalationReasonLabelCoverageTest`
// (backend) guards the backend side against the enum growing silently; there
// is no DB access from the frontend to guard this side the same way, so a
// missing entry here falls back to the raw reason string (never blank).
export const ESCALATION_REASON_LABELS: Record<string, string> = {
  low_confidence: 'Baja confianza',
  off_domain: 'Fuera de ámbito',
  sensitive_topic: 'Tema sensible',
  explicit_request: 'Petición explícita',
  salary_coverage_gap: 'Hueco salarial',
  salary_not_in_chat: 'Salario no disponible',
  reference_fact_coverage_gap: 'Hueco en datos de referencia',
  // Correction-02: renamed from 'Hueco en el texto del convenio', which read
  // as an ordinary prose-retrieval gap and was indistinguishable from one on
  // the badge/filter — see the backend REASON_LABELS comment for the full
  // rationale. Kept in sync with EscalationController::REASON_LABELS.
  estatuto_fallback_gap: 'Convenio vencido / sin texto vigente',
  conflict: 'Conflicto',
  quality_sample_wrong: 'Muestra de calidad incorrecta',
};

/** Filter-dropdown options: "Todos los motivos" + one row per known reason. */
export const ESCALATION_REASON_FILTERS: Array<{ id: string; label: string }> = [
  { id: '', label: 'Todos los motivos' },
  ...Object.entries(ESCALATION_REASON_LABELS).map(([id, label]) => ({ id, label })),
];

/** Label for a reason value; falls back to the raw string for anything unmapped. */
export function escalationReasonLabel(reason: string | null | undefined): string {
  if (reason === null || reason === undefined || reason === '') {
    return '—';
  }
  return ESCALATION_REASON_LABELS[reason] ?? reason;
}
