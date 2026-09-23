import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ApiError, getKnowledgeGraph, type KnowledgeGraphResponse } from '../../../lib/api';
import { useT } from '../../../i18n/context';
import { useTheme } from '../../../theme/context';
import { buildRenderGraph } from './buildRenderGraph';
import { computeVisibility, DEFAULT_GRAPH_FILTERS, type GraphFilters } from './graphFilters';
import { hasWebGL } from './webgl';
import { GrafoNodeCard } from './GrafoNodeCard';
import type { RenderGraphData, RenderNode } from './graphTypes';

// Sprint 11c (plan.md §D.1, §E.1 step 6) — the Grafo section of
// `KnowledgeMapPage`: fetches the graph once, seeds the deterministic
// layout, then hands the SAME `RenderGraphData` to whichever renderer is
// active. `GrafoView` (3D, `3d-force-graph`/`three`) and `Grafo2D` (2D,
// `force-graph`) are each dynamically imported ONLY when selected, so a
// session that never opens Grafo — or opens it without WebGL — never pays
// for either chunk it doesn't use.
const GrafoView = lazy(() => import('./GrafoView'));
const Grafo2D = lazy(() => import('./Grafo2D'));

type RenderMode = '3d' | '2d';

export function GrafoSection({
  onOpenDocument,
  onOpenFact,
}: {
  onOpenDocument: (uuid: string) => void;
  onOpenFact: (uuid: string) => void;
}) {
  const t = useT();
  const { theme } = useTheme();
  const [response, setResponse] = useState<KnowledgeGraphResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Lazy initializers, not an effect: `hasWebGL()` is a synchronous
  // feature-detect, not a subscription to an external system, so computing it
  // during the initial render (once) is the right tool — an effect here would
  // just be a same-tick setState cascade with nothing to synchronize against.
  const [webgl] = useState<boolean>(hasWebGL);
  const [mode, setMode] = useState<RenderMode>(() => (webgl ? '3d' : '2d')); // R4: no WebGL → 2D is the only option
  const [selected, setSelected] = useState<RenderNode | null>(null);
  const [filters, setFilters] = useState<GraphFilters>(DEFAULT_GRAPH_FILTERS);

  useEffect(() => {
    getKnowledgeGraph()
      .then(setResponse)
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));
  }, []);

  // Memoized on `response` alone (NOT on `filters`): a new `graph` reference
  // is what the renderers' `[data]` effect keys off to rebuild the whole
  // simulation, so filter-chip toggles must never produce one (plan.md §D.3
  // "hide, don't relayout") — only a fresh fetch may.
  const graph: RenderGraphData | null = useMemo(() => (response ? buildRenderGraph(response) : null), [response]);
  const visibility = useMemo(() => (graph ? computeVisibility(graph, filters) : null), [graph, filters]);
  const territories = useMemo(() => (graph ? graph.nodes.filter((n) => n.type === 'territory') : []), [graph]);

  if (error) return <p className="error">{error}</p>;
  if (!response || !graph || !visibility) return <p className="muted">{t.grafo.loadingGraphText}</p>;

  const { hidden } = response.counts;

  const toggleTerritory = (id: string) => {
    setFilters((f) => ({ ...f, territory: f.territory === id ? null : id }));
  };

  return (
    <>
      <div className="map-toolbar grafo-toolbar">
        <div className="seg" role="group" aria-label={t.grafo.modeAriaLabel}>
          <button
            className={`seg-btn ${mode === '3d' ? 'is-active' : ''}`}
            onClick={() => setMode('3d')}
            disabled={!webgl}
            title={webgl ? undefined : t.grafo.webglUnavailableTitle}
          >
            3D
          </button>
          <button className={`seg-btn ${mode === '2d' ? 'is-active' : ''}`} onClick={() => setMode('2d')}>
            2D
          </button>
        </div>
        {!webgl && <span className="muted">{t.grafo.webglUnavailableNotice}</span>}
      </div>

      <div className="grafo-filters" role="group" aria-label={t.grafo.filtersAriaLabel}>
        {territories.map((node) => (
          <button
            key={node.id}
            type="button"
            className={`chip chip-toggle ${filters.territory === node.id ? 'is-active' : ''}`}
            aria-pressed={filters.territory === node.id}
            onClick={() => toggleTerritory(node.id)}
          >
            {node.label}
          </button>
        ))}
        <button
          type="button"
          className={`chip chip-toggle ${filters.hideHistorical ? 'is-active' : ''}`}
          aria-pressed={filters.hideHistorical}
          onClick={() => setFilters((f) => ({ ...f, hideHistorical: !f.hideHistorical }))}
        >
          {t.grafo.hideHistoricalChip}
        </button>
        <button
          type="button"
          className={`chip chip-toggle ${filters.hideUnverifiedAi ? 'is-active' : ''}`}
          aria-pressed={filters.hideUnverifiedAi}
          onClick={() => setFilters((f) => ({ ...f, hideUnverifiedAi: !f.hideUnverifiedAi }))}
        >
          {t.grafo.hideUnverifiedAiChip}
        </button>
        {(filters.territory != null || filters.hideHistorical || filters.hideUnverifiedAi) && (
          <button type="button" className="chip-x grafo-filters-clear" onClick={() => setFilters(DEFAULT_GRAPH_FILTERS)}>
            {t.grafo.clearFiltersButton}
          </button>
        )}
      </div>

      <div className="map-canvas grafo-canvas-wrap">
        <Suspense fallback={<p className="muted">{t.grafo.loadingRendererText}</p>}>
          {mode === '3d' ? (
            <GrafoView data={graph} theme={theme} visibility={visibility} onSelectNode={setSelected} />
          ) : (
            <Grafo2D data={graph} theme={theme} visibility={visibility} onSelectNode={setSelected} />
          )}
        </Suspense>
      </div>

      <p className="muted grafo-caption">
        {t.grafo.captionLegendBeforeFuchsia}
        <strong>{t.grafo.captionFuchsia}</strong>
        {' · '}
        {hidden.documents_orphan}
        {t.grafo.captionOrphanDocumentsMid}
        {hidden.facts_rejected}
        {t.grafo.captionRejectedFactsSuffix}
      </p>

      <GrafoNodeCard node={selected} onClose={() => setSelected(null)} onOpenDocument={onOpenDocument} onOpenFact={onOpenFact} />
    </>
  );
}
