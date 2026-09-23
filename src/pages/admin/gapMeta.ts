import type { GapKind } from '../../lib/api';
import type { Dict } from '../../i18n/es';

// Gap presentation, shared by the hierarchy and the coverage-gap panel. A
// coverage HOLE reads --danger/--warning; a STALENESS / scope note reads
// --neutral (resolved sanity check): an answerable scope is never a hole.
//
// Sprint 11b (plan.md §C.9 step 6) — label/hint text moved into
// `i18n/es.ts`/`en.ts`'s `gapMeta` namespace so this is locale-aware; `cls`
// stays here (a CSS class name, not chrome).
const GAP_CLASS: Record<GapKind, string> = {
  unanswerable: 'gap--danger',
  expired_no_successor: 'gap--warning',
  suspected_mistag: 'gap--warning',
  date_expired_active: 'gap--neutral',
  unscoped: 'gap--neutral',
  // Sprint 8: coverage-lens leaf reason codes (CorpusCoverageService::REASON_*).
  // These describe WHY a convenio×knowledge-type cell is uncovered, distinct
  // from the document-lens gap kinds above but sharing the same badge system.
  SCAN_NO_TEXT: 'gap--danger',
  UNDER_REVIEW_SCOPE: 'gap--warning',
  EXPIRED_NO_SUCCESSOR: 'gap--warning',
  SALARY_PDF_NOT_IMPORTED: 'gap--danger',
  FACT_NEEDS_REVIEW: 'gap--warning',
  // Sprint 8 follow-up (found live, eyes-on 2026-09-10): this cell used to
  // fall to `coverage_gap_unclassified` even though the service already
  // knows exactly why it's uncovered — see CorpusCoverageService's own
  // REASON_NO_SALARY_SOURCE doc-comment.
  NO_SALARY_SOURCE: 'gap--danger',
  coverage_gap_unclassified: 'gap--neutral',
};

export function gapMeta(t: Dict, kind: GapKind): { label: string; cls: string; hint: string } {
  const entry = t.gapMeta[kind];
  return { label: entry.label, hint: entry.hint, cls: GAP_CLASS[kind] };
}
