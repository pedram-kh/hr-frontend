import type { FactSetTrace, MessageTrace } from '../../lib/api';
import type { Dict } from '../../i18n/es';

// Slice 13d (ADR-0037) — the trace-panel text for several verified facts on one topic.
// Pure (like agentTrace.ts) so both dictionaries are unit-tested. Empty string when there is
// no `fact_set` block: a single fact / recency pick renders exactly as before.

const ids = (list: number[]) => list.map((id) => `#${id}`).join(', ');

/** Appended to the "Dato de referencia" step: which facts, and why they were answered together / refused together. */
export function factSetMeta(t: Dict, fs: FactSetTrace | undefined | null): string {
  if (!fs || !Array.isArray(fs.facts_selected) || fs.facts_selected.length === 0) return '';
  const tp = t.tracePanel;

  if (fs.composition === 'complementary') {
    const omitted = fs.facts_omitted?.length > 0 ? `${tp.factSetOmitted}${ids(fs.facts_omitted)}` : '';
    return `${tp.factSetPrefix}${ids(fs.facts_selected)}${tp.factSetComplementary}${omitted}`;
  }

  // Conflict: name the reason of the first contradictory pair (the one that refused the whole cohort).
  const bad = (fs.pairs ?? []).find((p) => p.relation === 'contradictory');
  const why =
    bad?.reason === 'no_quantity_keys'
      ? tp.factSetConflictNoKeys
      : bad?.reason === 'flagged_duplicate_unresolved'
        ? tp.factSetConflictFlagged
        : tp.factSetConflictSameQuantity;
  const shared = bad && bad.shared_keys.length > 0 ? `${tp.factSetSharedKeys}${bad.shared_keys.join(', ')}` : '';
  return `${tp.factSetConflictPrefix}${ids(fs.facts_selected)}${why}${shared}`;
}

/** Appended to the composition step (fact SET only): the facts offered to synthesis and the ones the answer cited. */
export function compositionFactsMeta(t: Dict, c: NonNullable<MessageTrace['composition']> | undefined | null): string {
  if (!c || !Array.isArray(c.fact_ids_offered) || c.fact_ids_offered.length === 0) return '';
  const cited = Array.isArray(c.fact_ids_cited) ? c.fact_ids_cited : [];

  return `${t.tracePanel.compositionFactsOffered}${ids(c.fact_ids_offered)}${t.tracePanel.compositionFactsCited}${cited.length > 0 ? ids(cited) : '—'}`;
}
