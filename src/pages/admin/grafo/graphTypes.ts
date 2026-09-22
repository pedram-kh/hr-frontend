import type { KnowledgeGraphEdge, KnowledgeGraphNode } from '../../../lib/api';

/** A node as handed to either renderer: the API node, plus its seeded starting position. */
export type RenderNode = KnowledgeGraphNode & { x: number; y: number; z: number };

/**
 * An edge as handed to either renderer — `source`/`target` are node ids,
 * matching both libraries' default accessors. `key` is a stable identity
 * (`source|target|kind`) computed once at build time: both `3d-force-graph`
 * and `force-graph` mutate `source`/`target` in place from an id string to
 * the resolved node object the first time `graphData()` runs, so filter
 * lookups (plan.md §D.3) can no longer key off `source`/`target` by then —
 * `key` survives that mutation untouched.
 */
export type RenderLink = Pick<KnowledgeGraphEdge, 'source' | 'target' | 'kind' | 'provenance'> & { key: string };

export interface RenderGraphData {
  nodes: RenderNode[];
  links: RenderLink[];
}
