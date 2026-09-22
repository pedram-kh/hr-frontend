import type { RenderGraphData } from './graphTypes';

/**
 * Sprint 11c (plan.md §D.3) — the three filter chips. Pure and DOM-free:
 * both renderers turn the same `VisibilityResult` into accessor functions,
 * so the hide/dim rules can never drift between the 3D and 2D views.
 *
 * `territory` hides nothing — it DIMS every node/link not reachable (via any
 * edge) from the selected territory hub. `hideHistorical` and
 * `hideUnverifiedAi` actually hide (spec: "removes N documents" / "removes N
 * facts + N documents + N edges"), including provenance-`unverified_ai`
 * edges even where neither endpoint's own state is `unverified_ai` (an
 * unverified AI *tag* on an otherwise-active document, e.g.).
 *
 * "Hide, don't relayout" (plan.md §D.3): this never touches node positions —
 * callers apply the result via `nodeVisibility`/`linkVisibility` and a
 * colour-alpha repaint, never by re-running `graphData()`.
 */
export interface GraphFilters {
  /** A territory hub node id (`t:…`), or `null` for no territory filter. */
  territory: string | null;
  hideHistorical: boolean;
  hideUnverifiedAi: boolean;
}

export const DEFAULT_GRAPH_FILTERS: GraphFilters = {
  territory: null,
  hideHistorical: false,
  hideUnverifiedAi: false,
};

/** How much a dimmed (not hidden) node/link is faded — a repaint-only alpha multiplier, not a hide. */
export const DIM_OPACITY = 0.12;

export interface VisibilityResult {
  hiddenNodes: Set<string>;
  dimmedNodes: Set<string>;
  hiddenLinks: Set<string>;
  dimmedLinks: Set<string>;
}

export function hasActiveFilter(filters: GraphFilters): boolean {
  return filters.territory != null || filters.hideHistorical || filters.hideUnverifiedAi;
}

export function computeVisibility(graph: RenderGraphData, filters: GraphFilters): VisibilityResult {
  const hiddenNodes = new Set<string>();
  for (const n of graph.nodes) {
    if (filters.hideHistorical && n.state === 'historical') hiddenNodes.add(n.id);
    if (filters.hideUnverifiedAi && n.state === 'unverified_ai') hiddenNodes.add(n.id);
  }

  const hiddenLinks = new Set<string>();
  for (const l of graph.links) {
    if (filters.hideUnverifiedAi && l.provenance === 'unverified_ai') {
      hiddenLinks.add(l.key);
      continue;
    }
    if (hiddenNodes.has(l.source) || hiddenNodes.has(l.target)) hiddenLinks.add(l.key);
  }

  const dimmedNodes = new Set<string>();
  const dimmedLinks = new Set<string>();
  if (filters.territory != null) {
    const territory = filters.territory;
    const adjacency = new Map<string, string[]>();
    for (const l of graph.links) {
      if (hiddenLinks.has(l.key)) continue;
      pushAdjacency(adjacency, l.source, l.target);
      pushAdjacency(adjacency, l.target, l.source);
    }

    const reachable = new Set<string>([territory]);
    const queue = [territory];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const next of adjacency.get(current) ?? []) {
        if (!reachable.has(next)) {
          reachable.add(next);
          queue.push(next);
        }
      }
    }

    for (const n of graph.nodes) {
      if (!hiddenNodes.has(n.id) && !reachable.has(n.id)) dimmedNodes.add(n.id);
    }
    for (const l of graph.links) {
      if (hiddenLinks.has(l.key)) continue;
      if (dimmedNodes.has(l.source) || dimmedNodes.has(l.target)) dimmedLinks.add(l.key);
    }
  }

  return { hiddenNodes, dimmedNodes, hiddenLinks, dimmedLinks };
}

function pushAdjacency(adjacency: Map<string, string[]>, from: string, to: string): void {
  const list = adjacency.get(from);
  if (list) {
    list.push(to);
  } else {
    adjacency.set(from, [to]);
  }
}
