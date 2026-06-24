import { useEffect, useState } from 'react';
import {
  getHierarchy,
  getHierarchyChildren,
  type GapKind,
  type HierarchyNode,
  type Lens,
} from '../../lib/api';
import { GAP_META } from './gapMeta';

export type HierarchyForm = 'list' | 'graph';

/**
 * The single reusable lens-hierarchy component (ADR-0001/0012). Lens-driven,
 * two-level + lazy, leaf-opens-card. Rendered in two forms from one data model:
 * an indented LIST and a hand-rolled SVG GRAPH (absolutely-positioned node boxes
 * + an SVG connector overlay — no layout dependency, resolved Q1).
 */
export function Hierarchy({
  lens,
  form,
  onOpenDocument,
  reloadKey,
}: {
  lens: Lens;
  form: HierarchyForm;
  onOpenDocument: (uuid: string) => void;
  reloadKey?: number;
}) {
  const [roots, setRoots] = useState<HierarchyNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<Map<string, HierarchyNode[]>>(new Map());

  // The parent remounts this component (key={lens}-{reloadKey}) on lens/reload
  // change, so state starts fresh — the effect only needs to fetch.
  useEffect(() => {
    let active = true;
    getHierarchy(lens)
      .then((r) => active && setRoots(r.nodes))
      .catch((e) => active && setError(String(e.message ?? e)));
    return () => {
      active = false;
    };
  }, [lens, reloadKey]);

  const ensureChildren = async (key: string) => {
    if (cache.has(key)) return;
    const r = await getHierarchyChildren(lens, key);
    setCache((prev) => new Map(prev).set(key, r.nodes));
  };

  if (error) return <p className="error">{error}</p>;
  if (roots === null) return <p className="muted">Loading map…</p>;
  if (roots.length === 0)
    return (
      <p className="notice">
        {lens === 'topic'
          ? 'No topics tagged yet — topic tagging arrives with the AI tier (Sprint 7). You can tag topics by hand from a document card.'
          : 'Nothing to show for this lens yet.'}
      </p>
    );

  return form === 'list' ? (
    <ListForm roots={roots} cache={cache} ensureChildren={ensureChildren} onOpenDocument={onOpenDocument} />
  ) : (
    <GraphForm roots={roots} cache={cache} ensureChildren={ensureChildren} onOpenDocument={onOpenDocument} />
  );
}

function GapBadge({ kind }: { kind: GapKind }) {
  const m = GAP_META[kind];
  return (
    <span className={`gap-badge ${m.cls}`} title={m.hint}>
      <span aria-hidden="true">●</span> {m.label}
    </span>
  );
}

function isLeaf(node: HierarchyNode): boolean {
  return node.child_kind === 'leaf';
}

// -----------------------------------------------------------------------------
// LIST form — indented disclosure tree
// -----------------------------------------------------------------------------

function ListForm({
  roots,
  cache,
  ensureChildren,
  onOpenDocument,
}: {
  roots: HierarchyNode[];
  cache: Map<string, HierarchyNode[]>;
  ensureChildren: (key: string) => Promise<void>;
  onOpenDocument: (uuid: string) => void;
}) {
  return (
    <ul className="lens-list" role="tree">
      {roots.map((n) => (
        <ListNode key={n.key} node={n} depth={0} cache={cache} ensureChildren={ensureChildren} onOpenDocument={onOpenDocument} />
      ))}
    </ul>
  );
}

function ListNode({
  node,
  depth,
  cache,
  ensureChildren,
  onOpenDocument,
}: {
  node: HierarchyNode;
  depth: number;
  cache: Map<string, HierarchyNode[]>;
  ensureChildren: (key: string) => Promise<void>;
  onOpenDocument: (uuid: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const leaf = isLeaf(node);
  const children = cache.get(node.key);

  const toggle = async () => {
    if (leaf) {
      if (node.doc_uuid) onOpenDocument(node.doc_uuid);
      return;
    }
    if (!open && !children) {
      setBusy(true);
      try {
        await ensureChildren(node.key);
      } finally {
        setBusy(false);
      }
    }
    setOpen((o) => !o);
  };

  return (
    <li role="treeitem" aria-expanded={leaf ? undefined : open}>
      <button
        className={`lens-row ${leaf ? 'lens-row--leaf' : ''} ${node.gap_kind ? 'has-gap' : ''}`}
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
        onClick={toggle}
      >
        {!leaf && <span className={`lens-caret ${open ? 'is-open' : ''}`} aria-hidden="true">▶</span>}
        {leaf && <span className="lens-leaf-dot" aria-hidden="true">·</span>}
        <span className="lens-label">{node.label}</span>
        {node.meta && <span className="lens-meta">{node.meta}</span>}
        {typeof node.count === 'number' && !leaf && <span className="lens-count">{node.count}</span>}
        {leaf && node.retrieval_status && <span className={`badge badge-${node.retrieval_status === 'active' ? 'verified' : 'historical'}`}>{node.retrieval_status}</span>}
        {node.gap_kind && <GapBadge kind={node.gap_kind} />}
      </button>
      {!leaf && open && (
        <ul role="group">
          {busy && <li className="muted lens-loading">Loading…</li>}
          {(children ?? []).map((c) => (
            <ListNode key={c.key} node={c} depth={depth + 1} cache={cache} ensureChildren={ensureChildren} onOpenDocument={onOpenDocument} />
          ))}
          {children && children.length === 0 && <li className="muted lens-loading">(empty)</li>}
        </ul>
      )}
    </li>
  );
}

// -----------------------------------------------------------------------------
// GRAPH form — cascading columns with a hand-rolled SVG connector overlay
// -----------------------------------------------------------------------------

const COL_W = 210;
const COL_GAP = 56;
const ROW_H = 56;
const ROW_GAP = 12;
const TOP_PAD = 8;

function GraphForm({
  roots,
  cache,
  ensureChildren,
  onOpenDocument,
}: {
  roots: HierarchyNode[];
  cache: Map<string, HierarchyNode[]>;
  ensureChildren: (key: string) => Promise<void>;
  onOpenDocument: (uuid: string) => void;
}) {
  // selectedPath[k] = the key selected in column k (drives column k+1).
  const [selectedPath, setSelectedPath] = useState<string[]>([]);

  // Build the visible columns from roots + the cached children along the path.
  const columns: HierarchyNode[][] = [roots];
  for (let k = 0; k < selectedPath.length; k++) {
    const kids = cache.get(selectedPath[k]);
    if (!kids) break;
    columns.push(kids);
  }

  const onSelect = async (colIndex: number, node: HierarchyNode) => {
    if (isLeaf(node)) {
      if (node.doc_uuid) onOpenDocument(node.doc_uuid);
      return;
    }
    await ensureChildren(node.key);
    setSelectedPath((prev) => [...prev.slice(0, colIndex), node.key]);
  };

  const colHeight = (nodes: HierarchyNode[]) => TOP_PAD * 2 + nodes.length * (ROW_H + ROW_GAP);
  const totalHeight = Math.max(...columns.map(colHeight), 120);
  const totalWidth = columns.length * COL_W + (columns.length - 1) * COL_GAP;

  const nodeX = (col: number) => col * (COL_W + COL_GAP);
  const nodeY = (idx: number) => TOP_PAD + idx * (ROW_H + ROW_GAP);
  const centerY = (idx: number) => nodeY(idx) + ROW_H / 2;

  // Connector paths: from the selected parent (col k) to each child (col k+1).
  const paths: { d: string; gap: boolean }[] = [];
  for (let k = 0; k + 1 < columns.length; k++) {
    const parentIdx = columns[k].findIndex((n) => n.key === selectedPath[k]);
    if (parentIdx < 0) continue;
    const px = nodeX(k) + COL_W;
    const py = centerY(parentIdx);
    columns[k + 1].forEach((child, ci) => {
      const cx = nodeX(k + 1);
      const cy = centerY(ci);
      const mx = (px + cx) / 2;
      paths.push({ d: `M ${px} ${py} C ${mx} ${py}, ${mx} ${cy}, ${cx} ${cy}`, gap: Boolean(child.gap_kind) });
    });
  }

  return (
    <div className="lens-graph-scroll">
      <div className="lens-graph" style={{ width: totalWidth, height: totalHeight }}>
        <svg className="lens-graph-svg" width={totalWidth} height={totalHeight} aria-hidden="true">
          {paths.map((p, i) => (
            <path key={i} d={p.d} className={`lens-edge ${p.gap ? 'lens-edge--gap' : ''}`} fill="none" />
          ))}
        </svg>
        {columns.map((nodes, col) =>
          nodes.map((node, idx) => (
            <button
              key={node.key}
              className={`lens-node ${isLeaf(node) ? 'lens-node--leaf' : ''} ${selectedPath[col] === node.key ? 'is-selected' : ''} ${node.gap_kind ? 'has-gap' : ''}`}
              style={{ left: nodeX(col), top: nodeY(idx), width: COL_W, height: ROW_H }}
              onClick={() => onSelect(col, node)}
              title={node.label}
            >
              <span className="lens-node-label">{node.label}</span>
              <span className="lens-node-sub">
                {typeof node.count === 'number' && !isLeaf(node) ? `${node.count} doc${node.count === 1 ? '' : 's'}` : null}
                {isLeaf(node) && node.retrieval_status ? node.retrieval_status : null}
                {node.gap_kind ? ` · ${GAP_META[node.gap_kind].label}` : null}
              </span>
            </button>
          )),
        )}
      </div>
    </div>
  );
}
