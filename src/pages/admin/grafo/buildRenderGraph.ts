import type { KnowledgeGraphResponse } from '../../../lib/api';
import { seedPositions } from './layoutSeed';
import type { RenderGraphData } from './graphTypes';

/**
 * Merges the API response with the seeded starting layout (plan.md §C.1).
 * Pure and DOM-free on purpose — both `GrafoView` (3D) and `Grafo2D` call
 * this same function, so the seed can never drift between the two renderers.
 */
export function buildRenderGraph(data: KnowledgeGraphResponse): RenderGraphData {
  const positionById = new Map(seedPositions(data.nodes.map((n) => n.id)).map((p) => [p.id, p]));

  return {
    nodes: data.nodes.map((n) => {
      const pos = positionById.get(n.id);
      return { ...n, x: pos?.x ?? 0, y: pos?.y ?? 0, z: pos?.z ?? 0 };
    }),
    links: data.edges.map((e) => ({
      source: e.source,
      target: e.target,
      kind: e.kind,
      provenance: e.provenance,
      key: `${e.source}|${e.target}|${e.kind}`,
    })),
  };
}
