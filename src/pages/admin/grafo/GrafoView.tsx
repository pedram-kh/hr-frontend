import { useEffect, useRef } from 'react';
import ForceGraph3D, { type ForceGraph3DInstance } from '3d-force-graph';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { Object3D } from 'three';
import type { NodeObject } from 'three-forcegraph';
import { SIM_CONFIG } from './simConfig';
import { edgeColor, nodeColor, readToken } from './graphColors';
import { DIM_OPACITY, type VisibilityResult } from './graphFilters';
import { nodeVal } from './nodeSize';
import type { RenderGraphData, RenderLink, RenderNode } from './graphTypes';

// Sprint 11c (plan.md §6, §C.1, §D.4) — the 3D view. This is the ONLY module
// that imports `3d-force-graph`/`three` (358 KB gzip): `KnowledgeMapPage`
// only reaches this file through `React.lazy(() => import('./grafo/GrafoView'))`
// behind a WebGL check (see `webgl.ts`), so a machine without WebGL never
// downloads it. Default-exported for exactly that dynamic import.

type G3DNode = RenderNode & NodeObject;
type G3DLink = RenderLink;

export default function GrafoView({
  data,
  theme,
  visibility,
  onSelectNode,
}: {
  data: RenderGraphData;
  /** Only used to trigger a token re-read on flip (`useTheme().theme`) — the tokens themselves are read live, not from this value. */
  theme: string;
  /** Filter chips result (plan.md §D.3) — repainted on change, never rebuilds the simulation. */
  visibility: VisibilityResult;
  onSelectNode: (node: RenderNode) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<ForceGraph3DInstance<G3DNode, G3DLink> | null>(null);
  // Read by the `[data]` effect at graph-creation time only — the `[theme,
  // visibility]` effect below is what keeps this in sync afterwards. Synced
  // in its own effect (not during render) per react-hooks/refs.
  const visibilityRef = useRef(visibility);
  useEffect(() => {
    visibilityRef.current = visibility;
  }, [visibility]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const labelRenderer = new CSS2DRenderer();
    const graph = new ForceGraph3D(container, {
      // `Renderer` (the array's element type, per `3d-force-graph`'s own
      // .d.ts) isn't a type `@types/three` currently exports at all — hence
      // `any` here rather than a cast to some named three.js type.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      extraRenderers: [labelRenderer as any],
    }) as unknown as ForceGraph3DInstance<G3DNode, G3DLink>;
    graphRef.current = graph;

    // Persistent labels ONLY on the 46 scope nodes (plan.md §B.4) — real DOM
    // elements via CSS2DRenderer, so they stay legible text at any zoom
    // instead of a sprite that blurs/scales with the camera. `extend: true`
    // keeps the default sphere too; this only ADDS the label.
    const threeObjectAccessor = ((n: G3DNode) =>
      n.state === 'scope' ? makeLabelObject(n.label) : undefined) as unknown as (n: G3DNode) => Object3D;

    graph
      .graphData({ nodes: data.nodes as G3DNode[], links: data.links as unknown as G3DLink[] })
      .nodeLabel((n) => n.label) // hover tooltip for the 215 non-scope nodes — free, built in
      .nodeVal((n) => nodeVal(n.degree))
      .nodeThreeObjectExtend(true)
      .nodeThreeObject(threeObjectAccessor)
      .linkWidth(0.6)
      .linkOpacity(0.65)
      .warmupTicks(SIM_CONFIG.warmupTicks)
      .cooldownTicks(SIM_CONFIG.cooldownTicks)
      .cooldownTime(SIM_CONFIG.cooldownTime)
      .numDimensions(SIM_CONFIG.numDimensions)
      .backgroundColor(readToken('--canvas'))
      .onNodeClick((n) => onSelectNode(n));
    applyVisibility(graph, visibilityRef.current);

    const resize = () => {
      graph.width(container.clientWidth).height(container.clientHeight);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    return () => {
      ro.disconnect();
      graph._destructor();
      graphRef.current = null;
    };
    // `data` is the layout-defining input (plan.md §C.1) — deliberately the
    // only dependency that rebuilds the simulation. Theme flips re-read
    // tokens in the effect below instead of restarting the layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Theme flip (ThemeProvider sets data-theme; graphColors re-reads the CSS
  // custom property live) AND filter-chip changes (plan.md §D.3) — both are
  // repaint-only: no relayout, no cooldown restart.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.backgroundColor(readToken('--canvas'));
    applyVisibility(graph, visibility);
  }, [theme, visibility]);

  return <div ref={containerRef} className="grafo-canvas" />;
}

function applyVisibility(graph: ForceGraph3DInstance<G3DNode, G3DLink>, visibility: VisibilityResult): void {
  graph
    .nodeColor((n) => nodeColor(n.state, visibility.dimmedNodes.has(n.id) ? DIM_OPACITY : 1))
    .nodeVisibility((n) => !visibility.hiddenNodes.has(n.id))
    .linkColor((l) => edgeColor(l.provenance, visibility.dimmedLinks.has(l.key) ? DIM_OPACITY : 1))
    .linkVisibility((l) => !visibility.hiddenLinks.has(l.key));
}

function makeLabelObject(text: string): CSS2DObject {
  const el = document.createElement('div');
  el.className = 'grafo-label';
  el.textContent = text;
  return new CSS2DObject(el);
}
