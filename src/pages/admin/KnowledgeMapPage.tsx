import { useEffect, useState } from 'react';
import { getCoverageGaps, type CoverageGaps, type GapKind, type Lens } from '../../lib/api';
import { DocumentDetailPanel } from './DocumentDetailPanel';
import { GAP_META } from './gapMeta';
import { Hierarchy, type HierarchyForm } from './Hierarchy';

const LENSES: { id: Lens; label: string }[] = [
  { id: 'territory', label: 'Territory' },
  { id: 'sector', label: 'Sector' },
  { id: 'validity', label: 'Validity' },
  { id: 'topic', label: 'Topic' },
];

// Knowledge → Map: the lens hierarchy (ADR-0001) with coverage-gap markers
// (deploy.md §5), in branching-graph and indented-list forms. A leaf opens the
// document card on the right.
export function KnowledgeMapPage({ onOpenEscalation }: { onOpenEscalation?: (uuid: string) => void } = {}) {
  const [lens, setLens] = useState<Lens>('territory');
  const [form, setForm] = useState<HierarchyForm>('graph');
  const [selected, setSelected] = useState<string | null>(null);
  const [gaps, setGaps] = useState<CoverageGaps | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadGaps = () => {
    getCoverageGaps().then(setGaps).catch(() => setGaps(null));
  };
  useEffect(loadGaps, []);

  // After an edit in the card, refresh the map + gaps (a retag/lifecycle change
  // can add or clear a gap node).
  const onChanged = () => {
    setReloadKey((k) => k + 1);
    loadGaps();
  };

  return (
    <div className="docs-layout">
      <div className="docs-main">
        <div className="map-toolbar">
          <div className="seg" role="tablist" aria-label="Lens">
            {LENSES.map((l) => (
              <button
                key={l.id}
                role="tab"
                aria-selected={lens === l.id}
                className={`seg-btn ${lens === l.id ? 'is-active' : ''}`}
                onClick={() => setLens(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="View">
            <button className={`seg-btn ${form === 'graph' ? 'is-active' : ''}`} onClick={() => setForm('graph')}>
              Graph
            </button>
            <button className={`seg-btn ${form === 'list' ? 'is-active' : ''}`} onClick={() => setForm('list')}>
              List
            </button>
          </div>
        </div>

        {gaps && <CoverageGapBar gaps={gaps} />}

        <div className="map-canvas">
          <Hierarchy key={`${lens}-${reloadKey}`} lens={lens} form={form} reloadKey={reloadKey} onOpenDocument={setSelected} />
        </div>
      </div>

      {selected && (
        <DocumentDetailPanel uuid={selected} onClose={() => setSelected(null)} onChanged={onChanged} onOpenEscalation={onOpenEscalation} />
      )}
    </div>
  );
}

function CoverageGapBar({ gaps }: { gaps: CoverageGaps }) {
  const order: GapKind[] = ['unanswerable', 'expired_no_successor', 'suspected_mistag', 'date_expired_active'];
  const total = order.reduce((s, k) => s + (gaps.counts[k] ?? 0), 0);

  return (
    <div className="gap-bar">
      <strong className="gap-bar-title">Coverage gaps</strong>
      {total === 0 && <span className="muted">None detected.</span>}
      {order.map((k) => {
        const n = gaps.counts[k] ?? 0;
        if (n === 0) return null;
        const m = GAP_META[k];
        return (
          <span key={k} className={`gap-badge ${m.cls}`} title={m.hint}>
            <span aria-hidden="true">●</span> {m.label}: {n}
          </span>
        );
      })}
    </div>
  );
}
