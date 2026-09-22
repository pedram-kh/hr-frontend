import { describe, expect, it } from 'vitest';
import { computeVisibility, DEFAULT_GRAPH_FILTERS, hasActiveFilter, type GraphFilters } from './graphFilters';
import type { RenderGraphData, RenderNode } from './graphTypes';

// Sprint 11c (plan.md §D.3) — filter chips are pure hide/dim logic, tested
// against a small fixture graph shaped like the real one: a territory hub,
// two convenios under it (one historical, one active), a fact with an
// unverified-AI tag on the active convenio, and an unrelated second
// territory + convenio to prove "dim, don't hide" is scoped correctly.

function node(id: string, overrides: Partial<RenderNode> = {}): RenderNode {
  return {
    id,
    type: 'convenio',
    label: id,
    state: 'active',
    degree: 1,
    counts: {},
    link: null,
    x: 0,
    y: 0,
    z: 0,
    ...overrides,
  };
}

function fixture(): RenderGraphData {
  return {
    nodes: [
      node('t:1', { type: 'territory', state: 'scope', label: 'Bizkaia' }),
      node('c:1', { state: 'active', label: 'Convenio activo' }),
      node('c:2', { state: 'historical', label: 'Convenio histórico' }),
      node('fact:1', { type: 'fact', state: 'unverified_ai', label: 'Dato IA' }),
      node('t:2', { type: 'territory', state: 'scope', label: 'Araba' }),
      node('c:3', { state: 'active', label: 'Convenio ajeno' }),
    ],
    links: [
      { source: 'c:1', target: 't:1', kind: 'convenio_territory', provenance: 'system', key: 'c:1|t:1|convenio_territory' },
      { source: 'c:2', target: 't:1', kind: 'convenio_territory', provenance: 'system', key: 'c:2|t:1|convenio_territory' },
      { source: 'fact:1', target: 'c:1', kind: 'fact_convenio', provenance: 'unverified_ai', key: 'fact:1|c:1|fact_convenio' },
      { source: 'c:3', target: 't:2', kind: 'convenio_territory', provenance: 'system', key: 'c:3|t:2|convenio_territory' },
    ],
  };
}

describe('hasActiveFilter', () => {
  it('is false for the default (no filters) state', () => {
    expect(hasActiveFilter(DEFAULT_GRAPH_FILTERS)).toBe(false);
  });

  it('is true when any single filter is set', () => {
    expect(hasActiveFilter({ ...DEFAULT_GRAPH_FILTERS, territory: 't:1' })).toBe(true);
    expect(hasActiveFilter({ ...DEFAULT_GRAPH_FILTERS, hideHistorical: true })).toBe(true);
    expect(hasActiveFilter({ ...DEFAULT_GRAPH_FILTERS, hideUnverifiedAi: true })).toBe(true);
  });
});

describe('computeVisibility — no filters', () => {
  it('hides and dims nothing', () => {
    const result = computeVisibility(fixture(), DEFAULT_GRAPH_FILTERS);
    expect(result.hiddenNodes.size).toBe(0);
    expect(result.dimmedNodes.size).toBe(0);
    expect(result.hiddenLinks.size).toBe(0);
    expect(result.dimmedLinks.size).toBe(0);
  });
});

describe('computeVisibility — hideHistorical', () => {
  it('hides historical nodes and their incident edges, leaving everything else untouched', () => {
    const filters: GraphFilters = { ...DEFAULT_GRAPH_FILTERS, hideHistorical: true };
    const result = computeVisibility(fixture(), filters);
    expect(result.hiddenNodes).toEqual(new Set(['c:2']));
    expect(result.hiddenLinks).toEqual(new Set(['c:2|t:1|convenio_territory']));
    expect(result.dimmedNodes.size).toBe(0);
    // The active convenio under the same territory is untouched.
    expect(result.hiddenNodes.has('c:1')).toBe(false);
  });
});

describe('computeVisibility — hideUnverifiedAi', () => {
  it('hides unverified-AI nodes AND unverified-AI-provenance edges, even off an otherwise-active node', () => {
    const filters: GraphFilters = { ...DEFAULT_GRAPH_FILTERS, hideUnverifiedAi: true };
    const result = computeVisibility(fixture(), filters);
    expect(result.hiddenNodes).toEqual(new Set(['fact:1']));
    expect(result.hiddenLinks).toEqual(new Set(['fact:1|c:1|fact_convenio']));
    // c:1 itself is 'active', not 'unverified_ai' — the tag is on the edge/fact, not the convenio.
    expect(result.hiddenNodes.has('c:1')).toBe(false);
  });
});

describe('computeVisibility — territory (dim, not hide)', () => {
  it('dims everything unreachable from the selected territory, hiding nothing', () => {
    const filters: GraphFilters = { ...DEFAULT_GRAPH_FILTERS, territory: 't:1' };
    const result = computeVisibility(fixture(), filters);
    expect(result.hiddenNodes.size).toBe(0);
    expect(result.hiddenLinks.size).toBe(0);
    // t:2 and c:3 are not reachable from t:1 — dimmed.
    expect(result.dimmedNodes).toEqual(new Set(['t:2', 'c:3']));
    expect(result.dimmedLinks).toEqual(new Set(['c:3|t:2|convenio_territory']));
  });

  it('keeps everything reachable through any edge (including the unverified-AI fact) undimmed', () => {
    const filters: GraphFilters = { ...DEFAULT_GRAPH_FILTERS, territory: 't:1' };
    const result = computeVisibility(fixture(), filters);
    for (const id of ['t:1', 'c:1', 'c:2', 'fact:1']) {
      expect(result.dimmedNodes.has(id), `expected '${id}' to be reachable, not dimmed`).toBe(false);
    }
  });
});

describe('computeVisibility — combined filters', () => {
  it('a node hidden by hideHistorical is excluded from the territory reachability graph, not just dimmed', () => {
    const filters: GraphFilters = { territory: 't:1', hideHistorical: true, hideUnverifiedAi: false };
    const result = computeVisibility(fixture(), filters);
    expect(result.hiddenNodes).toEqual(new Set(['c:2']));
    // c:2 is hidden, so it must never also show up as merely dimmed.
    expect(result.dimmedNodes.has('c:2')).toBe(false);
    expect(result.dimmedNodes).toEqual(new Set(['t:2', 'c:3']));
  });

  it('all three filters together compose without throwing and hide/dim disjoint sets', () => {
    const filters: GraphFilters = { territory: 't:1', hideHistorical: true, hideUnverifiedAi: true };
    const result = computeVisibility(fixture(), filters);
    expect(result.hiddenNodes).toEqual(new Set(['c:2', 'fact:1']));
    for (const id of result.hiddenNodes) {
      expect(result.dimmedNodes.has(id)).toBe(false);
    }
  });
});
