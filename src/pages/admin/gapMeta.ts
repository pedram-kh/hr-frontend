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
};
