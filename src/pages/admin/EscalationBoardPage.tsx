import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  ApiError,
  canWorkEscalations,
  getEscalation,
  listEscalations,
  updateEscalation,
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

// Legal transitions mirrored from the server — only for UI hinting (the server
// enforces; we just avoid offering obviously-illegal drop targets).
const TRANSITIONS: Record<EscalationStatus, EscalationStatus[]> = {
  new: ['assigned', 'in_progress', 'closed'],
  assigned: ['in_progress', 'new', 'closed'],
  in_progress: ['resolved', 'assigned', 'closed'],
  resolved: ['closed', 'in_progress'],
  closed: ['in_progress'],
};

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

  // Optimistic drag state: uuid → status before the PATCH lands.
  const [optimistic, setOptimistic] = useState<Record<string, EscalationStatus>>({});
  // The card being dragged (for DragOverlay).
  const [dragging, setDragging] = useState<EscalationCardSummary | null>(null);
  // Ref so the drag-end handler can read the latest data without a stale closure.
  const dataRef = useRef(data);
  dataRef.current = data;

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
      .then((d) => {
        setData(d);
        // Clear any resolved optimistic overrides for cards now returned by the server.
        setOptimistic((prev) => {
          const next = { ...prev };
          d.cards.forEach((c) => { delete next[c.uuid]; });
          return next;
        });
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));
  };

  useEffect(load, [reason, mineOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCardChanged = () => load();

  // Cards with optimistic status applied.
  const cards = (): EscalationCardSummary[] =>
    (data?.cards ?? []).map((c) =>
      optimistic[c.uuid] ? { ...c, status: optimistic[c.uuid] } : c,
    );

  const byStatus = (status: EscalationStatus) =>
    cards().filter((c) => c.status === status);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require 8 px movement before drag starts — prevents accidental drags
      // when the user just wants to click to open the card.
      activationConstraint: { distance: 8 },
    }),
  );

  const onDragStart = (e: DragStartEvent) => {
    const card = (data?.cards ?? []).find((c) => c.uuid === e.active.id);
    setDragging(card ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const cardUuid = String(e.active.id);
    const targetStatus = e.over?.id ? (String(e.over.id) as EscalationStatus) : null;

    if (!targetStatus || !canWork) return;

    const card = (dataRef.current?.cards ?? []).find((c) => c.uuid === cardUuid);
    if (!card || card.status === targetStatus) return;

    // Only offer legal targets (the server would reject the rest).
    if (!TRANSITIONS[card.status]?.includes(targetStatus)) return;

    // Optimistic update: move the card visually immediately.
    setOptimistic((prev) => ({ ...prev, [cardUuid]: targetStatus }));

    updateEscalation(cardUuid, { status: targetStatus })
      .then(() => load()) // confirm + refresh counts
      .catch(() => {
        // Server rejected (illegal transition or no permission) — snap back.
        setOptimistic((prev) => {
          const next = { ...prev };
          delete next[cardUuid];
          return next;
        });
      });
  };

  return (
    <>
    <div className="docs-main">
        <div className="map-toolbar">
          <select
            className="select"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-label="Filtrar por motivo"
          >
            {REASON_FILTERS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <label className="board-filter-check">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(e) => setMineOnly(e.target.checked)}
              disabled={!identity?.id}
            />
            Solo asignadas a mí
          </label>
          {!canWork && (
            <span className="notice notice--neutral board-readonly">
              <span aria-hidden="true">🔒</span> Solo lectura — no tienes el permiso <code>escalation.work</code>.
            </span>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="board">
            {(data?.statuses ?? []).map((status) => (
              <BoardColumn
                key={status}
                status={status}
                cards={byStatus(status)}
                count={data?.counts[status] ?? byStatus(status).length}
                canWork={canWork}
                openUuid={openUuid}
                onOpen={(uuid) => setSelected(uuid)}
              />
            ))}
          </div>

          {/* Floating ghost card while dragging */}
          <DragOverlay dropAnimation={null}>
            {dragging ? (
              <div className="board-card board-card--ghost">
                <div className="board-card-top">
                  <span className="badge badge-review">{dragging.reason_label}</span>
                </div>
                <p className="board-card-q">{dragging.question ?? '(sin texto)'}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

    </div>
    {openUuid && (
      <CardDrawer
        uuid={openUuid}
        canWork={canWork}
        onClose={closeDrawer}
        onChanged={onCardChanged}
        fetchDetail={getEscalation}
      />
    )}
    </>
  );
}

// ---------- Column (drop target) -----------------------------------------------

function BoardColumn({
  status,
  cards,
  count,
  canWork,
  openUuid,
  onOpen,
}: {
  status: EscalationStatus;
  cards: EscalationCardSummary[];
  count: number;
  canWork: boolean;
  openUuid: string | null;
  onOpen: (uuid: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={canWork ? setNodeRef : undefined}
      className={`board-col${isOver && canWork ? ' board-col--over' : ''}`}
    >
      <div className="board-col-head">
        <span className="board-col-title">{COLUMN_LABELS[status] ?? status}</span>
        <span className="board-col-count">{count}</span>
      </div>
      <div className="board-col-body">
        {cards.length === 0 && <p className="muted board-empty">—</p>}
        {cards.map((card) => (
          <DraggableCard
            key={card.uuid}
            card={card}
            active={openUuid === card.uuid}
            canWork={canWork}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- Card (drag source) -------------------------------------------------

function DraggableCard({
  card,
  active,
  canWork,
  onOpen,
}: {
  card: EscalationCardSummary;
  active: boolean;
  canWork: boolean;
  onOpen: (uuid: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.uuid,
    disabled: !canWork,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      className={`board-card${active ? ' is-active' : ''}${isDragging ? ' board-card--dragging' : ''}`}
      onClick={() => onOpen(card.uuid)}
      {...(canWork ? { ...listeners, ...attributes } : {})}
    >
      <div className="board-card-top">
        <span className="badge badge-review">{card.reason_label}</span>
        {card.topic && <span className="chip board-card-topic">{card.topic.name}</span>}
      </div>
      <p className="board-card-q">{card.question ?? '(sin texto)'}</p>
      <div className="board-card-meta">
        <span>{card.employee?.full_name ?? '—'}</span>
        {card.employee?.convenio && (
          <span className="muted"> · {card.employee.convenio.numero}</span>
        )}
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
