import { describe, expect, it } from 'vitest';
import { es } from '../../i18n/es';
import { en } from '../../i18n/en';
import type { FactSetTrace } from '../../lib/api';
import { compositionFactsMeta, factSetMeta } from './factSetTrace';

// Slice 13d (ADR-0037): the trace panel reads which facts were answered together, or why a tie was refused.
const complementary: FactSetTrace = {
  composition: 'complementary',
  facts_selected: [140, 143],
  facts_omitted: [],
  order_rule: 'figures_desc,length_asc,id_asc',
  pairs: [{ a: 140, b: 143, relation: 'complementary', reason: 'disjoint_quantity_keys', shared_keys: [] }],
};

const conflict = (reason: FactSetTrace['pairs'][0]['reason'], shared: string[] = []): FactSetTrace => ({
  composition: 'conflict',
  facts_selected: [7, 8],
  facts_omitted: [],
  order_rule: null,
  pairs: [{ a: 7, b: 8, relation: 'contradictory', reason, shared_keys: shared }],
});

describe('factSetMeta', () => {
  it('renders nothing when there is no fact_set (single fact / recency pick render as before)', () => {
    expect(factSetMeta(es, undefined)).toBe('');
    expect(factSetMeta(en, null)).toBe('');
    expect(factSetMeta(es, { ...complementary, facts_selected: [] })).toBe('');
  });

  it('names the complementary facts in both dictionaries', () => {
    expect(factSetMeta(es, complementary)).toBe(' · datos #140, #143 (complementarios)');
    expect(factSetMeta(en, complementary)).toBe(' · facts #140, #143 (complementary)');
  });

  it('lists what the cap left out', () => {
    const capped = { ...complementary, facts_selected: [1, 2, 3], facts_omitted: [4, 5] };
    expect(factSetMeta(es, capped)).toBe(' · datos #1, #2, #3 (complementarios) · omitidos: #4, #5');
    expect(factSetMeta(en, capped)).toBe(' · facts #1, #2, #3 (complementary) · omitted: #4, #5');
  });

  it('says why a tie was refused, per reason, with the shared quantity', () => {
    expect(factSetMeta(es, conflict('same_quantity', ['horas_anuales']))).toBe(
      ' · CONFLICTO datos #7, #8 (misma magnitud) → escala, no mezcla · magnitud común: horas_anuales',
    );
    expect(factSetMeta(en, conflict('same_quantity', ['horas_anuales']))).toBe(
      ' · CONFLICT facts #7, #8 (same quantity) → escalate, do not mix · shared quantity: horas_anuales',
    );
    expect(factSetMeta(es, conflict('no_quantity_keys'))).toContain('sin magnitudes nombradas');
    expect(factSetMeta(en, conflict('no_quantity_keys'))).toContain('no named quantities');
    expect(factSetMeta(es, conflict('flagged_duplicate_unresolved'))).toContain('versiones pendientes de resolver');
    expect(factSetMeta(en, conflict('flagged_duplicate_unresolved'))).toContain('versions awaiting resolution');
  });
});

describe('compositionFactsMeta', () => {
  it('renders nothing for a single-fact composition', () => {
    expect(compositionFactsMeta(es, { detected: true })).toBe('');
    expect(compositionFactsMeta(en, undefined)).toBe('');
  });

  it('shows offered vs cited facts', () => {
    expect(compositionFactsMeta(es, { fact_ids_offered: [140, 143], fact_ids_cited: [140] })).toBe(' · datos ofrecidos: #140, #143 · citados: #140');
    expect(compositionFactsMeta(en, { fact_ids_offered: [140, 143], fact_ids_cited: [143, 140] })).toBe(' · facts offered: #140, #143 · cited: #143, #140');
    expect(compositionFactsMeta(en, { fact_ids_offered: [140, 143], fact_ids_cited: [] })).toBe(' · facts offered: #140, #143 · cited: —');
  });
});
