import { useEffect, useRef } from 'react';
import ForceGraph, { type NodeObject } from 'force-graph';
import { SIM_CONFIG } from './simConfig';
import { edgeColor, nodeColor, readToken } from './graphColors';
import { DIM_OPACITY, type VisibilityResult } from './graphFilters';
import { nodeVal } from './nodeSize';
import type { RenderGraphData, RenderLink, RenderNode } from './graphTypes';

// Sprint 11c (plan.md §B.3, §B.5) — the 2D view: canvas-based (`force-graph`,
// NOT `3d-force-graph`'s `numDimensions(2)`, which is still WebGL — see that
// section's reasoning). This is both the deliberate 2D toggle AND the R4
// no-WebGL fallback, so it must never import `3d-force-graph`/`three`.
// Default-exported for its own lazy chunk (`KnowledgeMapPage`'s second
// `React.lazy`), paid only by whoever opens 2D or lacks WebGL.

type G2DNode = RenderNode & NodeObject;
type G2DLink = RenderLink;

const NODE_REL_SIZE = 4;

export default function Grafo2D({
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
  const graphRef = useRef<ReturnType<typeof buildGraph> | null>(null);
  // `nodeCanvasObject` below is a closure created once in `buildGraph`; it
  // reads this ref on every frame so filter-chip changes repaint without
  // recreating the draw function (or the simulation). Synced in its own
  // effect (not during render) per react-hooks/refs.
  const visibilityRef = useRef(visibility);
  useEffect(() => {
    visibilityRef.current = visibility;
  }, [visibility]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const graph = buildGraph(container, data, visibilityRef, onSelectNode);
    graphRef.current = graph;
    applyVisibility(graph, visibilityRef.current);

    const resize = () => graph.width(container.clientWidth).height(container.clientHeight);
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    return () => {
      ro.disconnect();
      graph._destructor();
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Theme flip (backgroundColor is cached, unlike the canvas draw function
  // which re-reads tokens every frame) AND filter-chip changes — both a
  // repaint only, never a relayout.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.backgroundColor(readToken('--canvas'));
    applyVisibility(graph, visibility);
  }, [theme, visibility]);

  return <div ref={containerRef} className="grafo-canvas" />;
}

function applyVisibility(graph: ReturnType<typeof buildGraph>, visibility: VisibilityResult): void {
  graph
    .nodeVisibility((n) => !visibility.hiddenNodes.has(n.id))
    .linkColor((l) => edgeColor(l.provenance, visibility.dimmedLinks.has(l.key) ? DIM_OPACITY : 1))
    .linkVisibility((l) => !visibility.hiddenLinks.has(l.key));
}

function buildGraph(
  container: HTMLElement,
  data: RenderGraphData,
  visibilityRef: { current: VisibilityResult },
  onSelectNode: (node: RenderNode) => void,
) {
  const graph = new ForceGraph<G2DNode, G2DLink>(container);

  graph
    .graphData({ nodes: data.nodes as G2DNode[], links: data.links as unknown as G2DLink[] })
    .nodeLabel((n) => n.label)
    .nodeVal((n) => nodeVal(n.degree))
    .nodeCanvasObject((n, ctx, globalScale) => {
      const opacity = visibilityRef.current.dimmedNodes.has(n.id) ? DIM_OPACITY : 1;
      const r = Math.sqrt(nodeVal(n.degree)) * NODE_REL_SIZE;
      ctx.beginPath();
      ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, 2 * Math.PI);
      ctx.fillStyle = nodeColor(n.state, opacity);
      ctx.fill();

      // Persistent labels ONLY on the 46 scope nodes — everything else relies
      // on the built-in hover tooltip (`nodeLabel`), same split as the 3D view.
      if (n.state === 'scope') {
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = readToken('--text');
        ctx.globalAlpha = opacity;
        ctx.fillText(n.label, n.x ?? 0, (n.y ?? 0) + r + 2);
        ctx.globalAlpha = 1;
      }
    })
    .nodeCanvasObjectMode(() => 'replace')
    .linkWidth(0.6)
    .warmupTicks(SIM_CONFIG.warmupTicks)
    .cooldownTicks(SIM_CONFIG.cooldownTicks)
    .cooldownTime(SIM_CONFIG.cooldownTime)
    .backgroundColor(readToken('--canvas'))
    .onNodeClick((n) => onSelectNode(n));

  return graph;
}
