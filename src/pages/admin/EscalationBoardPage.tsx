import { useEffect, useState } from 'react';
import {
  ApiError,
  canWorkEscalations,
  getEscalation,
  listEscalations,
  type EscalationCardSummary,
  type EscalationList,
  type EscalationStatus,
} from '../../lib/api';
import { useAuth } from '../../auth/context';
import { CardDrawer } from './EscalationCardDrawer';

const COLUMN_LABELS: Record<EscalationStatus, string> = {
  new: 'Nuevas',
  assigned: 'Asignadas',
  in_progress: 'En curso',
  resolved: 'Resueltas',
  closed: 'Cerradas',
};

const REASON_FILTERS = [
  { id: '', label: 'Todos los motivos' },
  { id: 'low_confidence', label: 'Baja confianza' },
  { id: 'off_domain', label: 'Fuera de ámbito' },
  { id: 'sensitive_topic', label: 'Tema sensible' },
  { id: 'explicit_request', label: 'Petición explícita' },
  { id: 'salary_coverage_gap', label: 'Hueco salarial' },
  { id: 'conflict', label: 'Conflicto' },
];

// Knowledge → Escalations: the Sprint-4 board. Cards are created on every
// escalate (since 2b-1); here HR triages them. READS are open to any admin (an
// auditor browses read-only); assign/move/reply/resolve are gated by
// escalation.work and disabled otherwise.
export function EscalationBoardPage({
  focusUuid,
  onFocusHandled,
}: {
  focusUuid?: string | null;
  onFocusHandled?: () => void;
} = {}) {
  const { identity } = useAuth();
  const canWork = canWorkEscalations(identity);
  const [data, setData] = useState<EscalationList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  // The open card: a locally-clicked card, or the deep-linked one (from a
  // Knowledge-Center ruling back-link) until the user closes it. Derived — no
  // effect needed (closing clears both the local pick and the parent focus).
  const openUuid = selected ?? focusUuid ?? null;
  const closeDrawer = () => {
    setSelected(null);
    onFocusHandled?.();
  };

  const load = () => {
    listEscalations({
      reason: reason || undefined,
      assigned_to: mineOnly ? identity?.id : undefined,
    })
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));
  };

  useEffect(load, [reason, mineOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCardChanged = () => load();

  const byStatus = (status: EscalationStatus): EscalationCardSummary[] =>
    (data?.cards ?? []).filter((c) => c.status === status);

  return (
    <div className="docs-layout">
      <div className="docs-main">
        <div className="map-toolbar">
          <select className="select" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Filtrar por motivo">
            {REASON_FILTERS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <label className="board-filter-check">
            <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} disabled={!identity?.id} />
            Solo asignadas a mí
          </label>
          {!canWork && (
            <span className="notice notice--neutral board-readonly">
              <span aria-hidden="true">🔒</span> Solo lectura — no tienes el permiso <code>escalation.work</code>.
            </span>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        <div className="board">
          {data?.statuses.map((status) => {
            const cards = byStatus(status);
            return (
              <div key={status} className="board-col">
                <div className="board-col-head">
                  <span className="board-col-title">{COLUMN_LABELS[status] ?? status}</span>
                  <span className="board-col-count">{data.counts[status] ?? cards.length}</span>
                </div>
                <div className="board-col-body">
                  {cards.length === 0 && <p className="muted board-empty">—</p>}
                  {cards.map((card) => (
                    <BoardCard key={card.uuid} card={card} active={openUuid === card.uuid} onOpen={() => setSelected(card.uuid)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {openUuid && (
        <CardDrawer uuid={openUuid} canWork={canWork} onClose={closeDrawer} onChanged={onCardChanged} fetchDetail={getEscalation} />
      )}
    </div>
  );
}

function BoardCard({ card, active, onOpen }: { card: EscalationCardSummary; active: boolean; onOpen: () => void }) {
  return (
    <button type="button" className={`board-card ${active ? 'is-active' : ''}`} onClick={onOpen}>
      <div className="board-card-top">
        <span className="badge badge-review">{card.reason_label}</span>
        {card.topic && <span className="chip board-card-topic">{card.topic.name}</span>}
      </div>
      <p className="board-card-q">{card.question ?? '(sin texto)'}</p>
      <div className="board-card-meta">
        <span>{card.employee?.full_name ?? '—'}</span>
        {card.employee?.convenio && <span className="muted"> · {card.employee.convenio.numero}</span>}
      </div>
      <div className="board-card-foot">
        {card.assigned_to ? (
          <span className="chip board-card-assignee">{card.assigned_to.full_name}</span>
        ) : (
          <span className="muted board-card-unassigned">Sin asignar</span>
        )}
      </div>
    </button>
  );
}
