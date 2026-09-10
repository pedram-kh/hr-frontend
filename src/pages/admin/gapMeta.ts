import type { GapKind } from '../../lib/api';

// Gap presentation, shared by the hierarchy and the coverage-gap panel. A
// coverage HOLE reads --danger/--warning; a STALENESS / scope note reads
// --neutral (resolved sanity check): an answerable scope is never a hole.
export const GAP_META: Record<GapKind, { label: string; cls: string; hint: string }> = {
  unanswerable: {
    label: 'Unanswerable',
    cls: 'gap--danger',
    hint: 'Active document with 0 indexed chunks (e.g. a scanned PDF, or still under review) — it cannot answer.',
  },
  expired_no_successor: {
    label: 'No active successor',
    cls: 'gap--warning',
    hint: 'Only historical prose remains for this scope — no active version to answer from (coverage hole).',
  },
  suspected_mistag: {
    label: 'Suspected mistag',
    cls: 'gap--warning',
    hint: 'Tagged as convenio prose but the title/filename says "tabla" — likely a salary table. Human decides (retag in the card).',
  },
  date_expired_active: {
    label: 'Date-expired (still active)',
    cls: 'gap--neutral',
    hint: 'Validity end is in the past but the document is still active — a staleness signal, not a hole. The scope is still answerable.',
  },
  unscoped: {
    label: 'Unscoped',
    cls: 'gap--neutral',
    hint: 'A non-national document with no convenio carries no scope (the scope-rides-on-convenio limitation).',
  },
  // Sprint 8: coverage-lens leaf reason codes (CorpusCoverageService::REASON_*).
  // These describe WHY a convenio×knowledge-type cell is uncovered, distinct
  // from the document-lens gap kinds above but sharing the same badge system.
  SCAN_NO_TEXT: {
    label: 'Scan, no text',
    cls: 'gap--danger',
    hint: 'Active prose document(s) exist but have 0 indexed chunks (e.g. a scanned PDF) — it cannot answer.',
  },
  UNDER_REVIEW_SCOPE: {
    label: 'Scope under review',
    cls: 'gap--warning',
    hint: 'Prose document(s) exist but tagging is not yet verified — the scope is provisional, not yet answerable.',
  },
  EXPIRED_NO_SUCCESSOR: {
    label: 'Expired, no successor',
    cls: 'gap--warning',
    hint: 'Only historical/expired prose exists for this cell — no active successor to answer from.',
  },
  SALARY_PDF_NOT_IMPORTED: {
    label: 'Salary PDF not imported',
    cls: 'gap--danger',
    hint: 'A PDF salary document exists but has not been converted/imported into the salary table yet.',
  },
  FACT_NEEDS_REVIEW: {
    label: 'Fact needs review',
    cls: 'gap--warning',
    hint: 'A proposed reference fact exists but no human has verified it yet.',
  },
  // Sprint 8 follow-up (found live, eyes-on 2026-09-10): this cell used to
  // fall to `coverage_gap_unclassified` even though the service already
  // knows exactly why it's uncovered — see CorpusCoverageService's own
  // REASON_NO_SALARY_SOURCE doc-comment.
  NO_SALARY_SOURCE: {
    label: 'No salary source',
    cls: 'gap--danger',
    hint: 'No salary table, and no salary PDF either — nothing to import from yet.',
  },
  coverage_gap_unclassified: {
    label: 'Unclassified gap',
    cls: 'gap--neutral',
    hint: 'This cell is uncovered but does not match a known reason code — needs manual investigation.',
  },
};
