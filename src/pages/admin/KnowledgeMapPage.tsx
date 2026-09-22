import { useEffect, useState } from 'react';
import { canEditKnowledge, getCoverageGaps, type CoverageGaps, type GapKind, type Lens } from '../../lib/api';
import { useAuth } from '../../auth/context';
import { DocumentDetailPanel } from './DocumentDetailPanel';
import { GAP_META } from './gapMeta';
import { Hierarchy, type HierarchyForm } from './Hierarchy';
import { ReferenceFactPanel } from './ReferenceFactPanel';
import { ReferenceFactCreatePanel } from './ReferenceFactCreatePanel';
import { GrafoSection } from './grafo/GrafoSection';

const LENSES: { id: Lens; label: string }[] = [
  { id: 'territory', label: 'Territory' },
  { id: 'sector', label: 'Sector' },
  { id: 'validity', label: 'Validity' },
  { id: 'topic', label: 'Topic' },
];

type MapSection = 'hierarchy' | 'grafo';

/** `#view=map&tab=grafo` → Grafo; anything else (incl. no `tab` at all) → Jerarquía (plan.md §D.1). */
function sectionFromTab(tab: string | null): MapSection {
  return tab === 'grafo' ? 'grafo' : 'hierarchy';
}

// Knowledge → Map: the lens hierarchy (ADR-0001) with coverage-gap markers
// (deploy.md §5), in branching-graph and indented-list forms. A leaf opens the
// document card on the right. Sprint 11c adds a second section, Grafo — the
// corpus's honesty-gated knowledge graph — behind the same toolbar's leading
// `.seg` (§D.1); `initialTab` is `AdminShell`'s parsed `#view=map&tab=…`.
export function KnowledgeMapPage({
  onOpenEscalation,
  initialTab = null,
}: { onOpenEscalation?: (uuid: string) => void; initialTab?: string | null } = {}) {
  const { identity } = useAuth();
  const canEdit = canEditKnowledge(identity);
  const [section, setSection] = useState<MapSection>(() => sectionFromTab(initialTab));
  const [lens, setLens] = useState<Lens>('territory');
  const [form, setForm] = useState<HierarchyForm>('graph');
  const [selected, setSelected] = useState<string | null>(null);
  // Sprint 7b-1 (ADR-0021): a reference-fact leaf opens the fact card; the
  // toolbar button opens the manual create panel.
  const [selectedFact, setSelectedFact] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
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
    <>
    <div className="docs-main">
        <div className="map-toolbar">
          <div className="seg" role="tablist" aria-label="Sección">
            <button
              role="tab"
              aria-selected={section === 'hierarchy'}
              className={`seg-btn ${section === 'hierarchy' ? 'is-active' : ''}`}
              onClick={() => setSection('hierarchy')}
            >
              Jerarquía
            </button>
            <button
              role="tab"
              aria-selected={section === 'grafo'}
              className={`seg-btn ${section === 'grafo' ? 'is-active' : ''}`}
              onClick={() => setSection('grafo')}
            >
              Grafo
            </button>
          </div>
          {section === 'hierarchy' && (
            <>
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
            </>
          )}
          {canEdit && (
            <button className="btn btn-primary map-toolbar-action" onClick={() => setCreating(true)}>
              + New reference fact
            </button>
          )}
        </div>

        {gaps && <CoverageGapBar gaps={gaps} />}

        {section === 'hierarchy' ? (
          <div className="map-canvas">
            <Hierarchy
              key={`${lens}-${reloadKey}`}
              lens={lens}
              form={form}
              reloadKey={reloadKey}
              onOpenDocument={setSelected}
              onOpenFact={setSelectedFact}
            />
          </div>
        ) : (
          <GrafoSection onOpenDocument={setSelected} onOpenFact={setSelectedFact} />
        )}
    </div>
    {selected && (
      <DocumentDetailPanel uuid={selected} onClose={() => setSelected(null)} onChanged={onChanged} onOpenEscalation={onOpenEscalation} />
    )}
    {selectedFact && (
      <ReferenceFactPanel
        uuid={selectedFact}
        onClose={() => setSelectedFact(null)}
        onChanged={onChanged}
        onOpenDocument={(uuid) => { setSelectedFact(null); setSelected(uuid); }}
      />
    )}
    {creating && (
      <ReferenceFactCreatePanel
        onClose={() => setCreating(false)}
        onCreated={() => { setCreating(false); onChanged(); }}
      />
    )}
    </>
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
