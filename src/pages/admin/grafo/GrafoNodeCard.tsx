import { useT } from '../../../i18n/context';
import type { Dict } from '../../../i18n/es';
import type { RenderNode } from './graphTypes';

// Badge CSS classes stay in code (not chrome) — same split as `gapMeta`.
const STATE_BADGE_CLS: Record<RenderNode['state'], string> = {
  scope: 'badge-national',
  active: 'badge-verified',
  verified: 'badge-verified',
  draft: 'badge-review',
  historical: 'badge-historical',
  unverified_ai: 'ai-pill',
};

function typeLabel(t: Dict, type: RenderNode['type']): string {
  return t.grafo.typeLabels[type];
}

function stateBadge(t: Dict, state: RenderNode['state']): { cls: string; label: string } {
  return { cls: STATE_BADGE_CLS[state], label: t.grafo.stateLabels[state] };
}

function idWithoutPrefix(id: string): string {
  return id.slice(id.indexOf(':') + 1);
}

/**
 * Sprint 11c (plan.md §D.2) — deliberately thin: name, type, state badge,
 * counts, and a hand-off. This is NOT a second detail UI — for a document or
 * a fact the primary action opens the SAME panel `Hierarchy`'s leaves already
 * open (`onOpenDocument` → `DocumentDetailPanel`, `onOpenFact` →
 * `ReferenceFactPanel`); for a convenio it is `node.link`, built server-side
 * by `AdminLinks` so there is exactly one place that knows the hash scheme.
 * Hub nodes (territory/sector/topic) carry no link — they are aggregates,
 * not a thing with its own screen.
 */
export function GrafoNodeCard({
  node,
  onClose,
  onOpenDocument,
  onOpenFact,
}: {
  node: RenderNode | null;
  onClose: () => void;
  onOpenDocument: (uuid: string) => void;
  onOpenFact: (uuid: string) => void;
}) {
  const t = useT();
  if (!node) return null;
  const badge = stateBadge(t, node.state);

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <div className="detail panel grafo-node-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="detail-head">
          <strong>{node.label}</strong>
          <button className="btn btn-ghost" onClick={onClose} aria-label={t.common.close}>✕</button>
        </div>
        <div className="detail-body">
          <p>
            <span className="muted">{typeLabel(t, node.type)}</span>{' '}
            <span className={`badge ${badge.cls}`}>{badge.label}</span>
          </p>

          {Object.entries(node.counts ?? {}).length > 0 && (
            <p className="muted">
              {Object.entries(node.counts).map(([k, v]) => `${k}: ${v}`).join(' · ')}
            </p>
          )}

          {node.type === 'convenio' && node.folded && (node.folded.territory || node.folded.sector) && (
            <p className="muted">
              {node.folded.territory && (
                <>
                  {t.grafo.foldedTerritoryPrefix}
                  {node.folded.territory}
                  {t.grafo.foldedNoHubSuffix}{' '}
                </>
              )}
              {node.folded.sector && (
                <>
                  {t.grafo.foldedSectorPrefix}
                  {node.folded.sector}
                  {t.grafo.foldedNoHubSuffix}
                </>
              )}
            </p>
          )}

          {node.type === 'fact' && node.source_document && (
            <p className="muted">
              {t.grafo.sharedSourcePrefix}
              {node.source_document.title}
              {t.grafo.sharedSourceSuffix}
            </p>
          )}

          <p className="muted">
            {t.grafo.connectionsPrefix}
            {node.degree}
          </p>

          <div className="grafo-node-card-actions">
            {node.type === 'document' && (
              <button className="btn btn-primary" onClick={() => onOpenDocument(idWithoutPrefix(node.id))}>
                {t.grafo.openDocumentButton}
              </button>
            )}
            {node.type === 'fact' && (
              <button className="btn btn-primary" onClick={() => onOpenFact(idWithoutPrefix(node.id))}>
                {t.grafo.openReferenceFactButton}
              </button>
            )}
            {node.type === 'convenio' && node.link && (
              <a className="btn btn-primary" href={node.link}>
                {t.grafo.viewCoverageButton}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
