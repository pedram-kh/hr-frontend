import type { RenderNode } from './graphTypes';

const TYPE_LABEL: Record<RenderNode['type'], string> = {
  convenio: 'Convenio',
  document: 'Documento',
  fact: 'Dato de referencia',
  territory: 'Territorio',
  sector: 'Sector',
  topic: 'Tema',
};

const STATE_BADGE: Record<RenderNode['state'], { cls: string; label: string }> = {
  scope: { cls: 'badge-national', label: 'Ámbito' },
  active: { cls: 'badge-verified', label: 'Vigente' },
  verified: { cls: 'badge-verified', label: 'Verificado' },
  draft: { cls: 'badge-review', label: 'Borrador' },
  historical: { cls: 'badge-historical', label: 'Histórico' },
  unverified_ai: { cls: 'ai-pill', label: 'IA sin verificar' },
};

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
  if (!node) return null;
  const badge = STATE_BADGE[node.state];

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <div className="detail panel grafo-node-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="detail-head">
          <strong>{node.label}</strong>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="detail-body">
          <p>
            <span className="muted">{TYPE_LABEL[node.type]}</span>{' '}
            <span className={`badge ${badge.cls}`}>{badge.label}</span>
          </p>

          {Object.entries(node.counts ?? {}).length > 0 && (
            <p className="muted">
              {Object.entries(node.counts).map(([k, v]) => `${k}: ${v}`).join(' · ')}
            </p>
          )}

          {node.type === 'convenio' && node.folded && (node.folded.territory || node.folded.sector) && (
            <p className="muted">
              {node.folded.territory && <>Territorio: {node.folded.territory} (sin hub propio — muy pocos convenios). </>}
              {node.folded.sector && <>Sector: {node.folded.sector} (sin hub propio — muy pocos convenios).</>}
            </p>
          )}

          {node.type === 'fact' && node.source_document && (
            <p className="muted">
              Fuente compartida: «{node.source_document.title}» — no dibujada como nodo (ver honestidad del grafo).
            </p>
          )}

          <p className="muted">Conexiones: {node.degree}</p>

          <div className="grafo-node-card-actions">
            {node.type === 'document' && (
              <button className="btn btn-primary" onClick={() => onOpenDocument(idWithoutPrefix(node.id))}>
                Abrir documento
              </button>
            )}
            {node.type === 'fact' && (
              <button className="btn btn-primary" onClick={() => onOpenFact(idWithoutPrefix(node.id))}>
                Abrir dato de referencia
              </button>
            )}
            {node.type === 'convenio' && node.link && (
              <a className="btn btn-primary" href={node.link}>
                Ver cobertura
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
