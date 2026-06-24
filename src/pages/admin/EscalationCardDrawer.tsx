import { useEffect, useState } from 'react';
import {
  ApiError,
  getVocabulary,
  replyEscalation,
  resolveEscalation,
  updateEscalation,
  type ConversationMessage,
  type EscalationDetail,
  type EscalationStatus,
  type VocabularyItem,
} from '../../lib/api';
import { useAuth } from '../../auth/context';
import { CitationList } from '../chat/CitationList';
import { TracePanel } from '../chat/TracePanel';

// Legal status transitions (mirrors EscalationService::TRANSITIONS — the server
// validates; this only shapes the picker so an illegal move isn't offered).
const TRANSITIONS: Record<EscalationStatus, EscalationStatus[]> = {
  new: ['assigned', 'in_progress', 'closed'],
  assigned: ['in_progress', 'new', 'closed'],
  in_progress: ['resolved', 'assigned', 'closed'],
  resolved: ['closed', 'in_progress'],
  closed: ['in_progress'],
};

const STATUS_LABELS: Record<EscalationStatus, string> = {
  new: 'Nueva',
  assigned: 'Asignada',
  in_progress: 'En curso',
  resolved: 'Resuelta',
  closed: 'Cerrada',
};

// The card-scoped detail drawer: the conversation + trace for THIS card only
// (not a history browser), plus assign/move/reply/resolve for escalation.work
// holders. Reuses the Sprint-2/3 chat components (CitationList, TracePanel).
export function CardDrawer({
  uuid,
  canWork,
  onClose,
  onChanged,
  fetchDetail,
}: {
  uuid: string;
  canWork: boolean;
  onClose: () => void;
  onChanged: () => void;
  fetchDetail: (uuid: string) => Promise<EscalationDetail>;
}) {
  const { identity } = useAuth();
  const [detail, setDetail] = useState<EscalationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    fetchDetail(uuid)
      .then(setDetail)
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));
  };

  useEffect(load, [uuid]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = () => {
    load();
    onChanged();
  };

  if (error)
    return (
      <aside className="detail panel">
        <button className="btn btn-ghost" onClick={onClose}>✕ Cerrar</button>
        <p className="error">{error}</p>
      </aside>
    );
  if (!detail) return <aside className="detail panel"><p className="muted">Cargando…</p></aside>;

  const card = detail.card;
  const isResolved = card.status === 'resolved' || card.status === 'closed';
  const mineId = identity?.id;
  const assignedToMe = card.assigned_to?.id === mineId;

  const moveStatus = async (status: EscalationStatus) => {
    setBusy(true);
    try {
      await updateEscalation(uuid, { status });
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const setAssignee = async (assigned_to: number | null) => {
    setBusy(true);
    try {
      await updateEscalation(uuid, { assigned_to });
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="detail panel">
      <div className="detail-head">
        <strong>Escalación · {card.reason_label}</strong>
        <button className="btn btn-ghost" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>

      {!canWork && (
        <p className="notice notice--neutral">
          <span aria-hidden="true">🔒</span>
          Solo lectura — puedes ver la conversación y el razonamiento, pero no asignar, responder ni resolver.
        </p>
      )}

      <section>
        <dl className="kv">
          <dt>Estado</dt><dd>{STATUS_LABELS[card.status]}</dd>
          <dt>Empleado</dt><dd>{card.employee?.full_name ?? '—'}</dd>
          <dt>Convenio</dt><dd>{card.employee?.convenio ? `${card.employee.convenio.numero} — ${card.employee.convenio.name}` : '—'}</dd>
          <dt>Asignada a</dt><dd>{card.assigned_to?.full_name ?? 'Sin asignar'}</dd>
          {card.topic && (<><dt>Tema</dt><dd>{card.topic.name}</dd></>)}
        </dl>
      </section>

      {canWork && (
        <section>
          <h4>Triaje</h4>
          <div className="reassign">
            {!assignedToMe ? (
              <button className="btn btn-secondary" onClick={() => setAssignee(mineId ?? null)} disabled={busy || !mineId}>
                Asignarme
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={() => setAssignee(null)} disabled={busy}>
                Quitar asignación
              </button>
            )}
            <select
              className="select"
              value=""
              onChange={(e) => e.target.value && moveStatus(e.target.value as EscalationStatus)}
              disabled={busy}
              aria-label="Mover estado"
            >
              <option value="">Mover a…</option>
              {(TRANSITIONS[card.status] ?? []).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </section>
      )}

      <section>
        <h4>Conversación</h4>
        <p className="timeline-meta">La conversación de esta tarjeta (su sesión). No es un histórico general.</p>
        <div className="card-convo">
          {detail.conversation.map((m) => <ConversationBubble key={m.id} message={m} />)}
        </div>
      </section>

      {canWork && <ReplyBox uuid={uuid} disabled={busy} onSent={reload} />}

      {canWork && !isResolved && <SaveAsKnowledge uuid={uuid} onResolved={reload} />}

      <EventsLog events={detail.events} />
    </aside>
  );
}

// One conversation turn. A bot answer reuses the citation list + trace; a human
// (hr_agent) reply is a clearly-attributed distinct bubble — never mistakable
// for the bot. A user turn is the employee's question.
function ConversationBubble({ message }: { message: ConversationMessage }) {
  if (message.role === 'user') {
    return (
      <div className="chat-row chat-row--user">
        <div className="chat-bubble chat-bubble--user">{message.content}</div>
      </div>
    );
  }

  if (message.role === 'hr_agent') {
    return (
      <div className="chat-row chat-row--assistant">
        <div className="card chat-bubble chat-bubble--assistant chat-bubble--agent">
          <span className="badge badge-agent">Respuesta de {message.author_label ?? 'Recursos Humanos'} (persona)</span>
          <p className="answer-prose">{message.content}</p>
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div className="chat-row chat-row--assistant">
      <div className={`card chat-bubble chat-bubble--assistant ${message.escalated ? 'escalation' : ''}`}>
        {message.escalated && <span className="badge badge-review">Escalado a Recursos Humanos</span>}
        <p className="answer-prose">{message.content}</p>
        <CitationList citations={message.citations} />
        {message.trace && <TracePanel trace={message.trace} />}
      </div>
    </div>
  );
}

function ReplyBox({ uuid, disabled, onSent }: { uuid: string; disabled: boolean; onSent: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await replyEscalation(uuid, text.trim());
      setText('');
      onSent();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h4>Responder a la persona</h4>
      <p className="timeline-meta">Se enviará al chat del empleado como respuesta humana, claramente atribuida a Recursos Humanos.</p>
      <textarea
        className="textarea"
        rows={3}
        placeholder="Escribe la respuesta para el empleado…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy || disabled}
      />
      {err && <p className="error">{err}</p>}
      <button className="btn btn-primary" onClick={send} disabled={busy || disabled || !text.trim()}>
        {busy ? 'Enviando…' : 'Enviar respuesta'}
      </button>
    </section>
  );
}

// Resolve → Save as knowledge. Resolve-only marks the card resolved; "Save as
// knowledge" additionally publishes an internal_hr_ruling (requires a topic +
// scope confirmation). The no-override fence may block the publish (409).
function SaveAsKnowledge({ uuid, onResolved }: { uuid: string; onResolved: () => void }) {
  const [text, setText] = useState('');
  const [convert, setConvert] = useState(false);
  const [topics, setTopics] = useState<VocabularyItem[]>([]);
  const [topicId, setTopicId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ message: string; conflicts: { uuid: string; title: string }[] } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [published, setPublished] = useState<string | null>(null);

  useEffect(() => {
    getVocabulary('topics').then((r) => setTopics(r.items)).catch(() => setTopics([]));
  }, []);

  const doResolve = async (confirmScope: boolean) => {
    setBusy(true);
    setErr(null);
    setConflict(null);
    try {
      const res = await resolveEscalation(uuid, {
        resolution_text: text.trim(),
        convert,
        topic_id: convert && topicId ? Number(topicId) : null,
        confirm_scope_change: confirmScope,
      });
      setConfirming(false);
      if (res.publish) {
        setPublished(
          res.publish.round_trip.lossless
            ? `Publicada — ${res.publish.chunks_written} fragmento(s) indexados (texto íntegro verificado).`
            : `Publicada, pero el texto indexado NO coincide exactamente con el escrito (revisar — posible mangling).`,
        );
      }
      onResolved();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.body?.code === 'publish_blocked') {
        setConfirming(false);
        setConflict({
          message: String(e.body.message ?? ''),
          conflicts: (e.body.conflicts as { uuid: string; title: string }[]) ?? [],
        });
      } else {
        setErr(e instanceof ApiError ? e.message : String(e));
        setConfirming(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = () => {
    if (!text.trim()) return;
    if (convert) {
      setConfirming(true); // scope-confirm gate before any publish
    } else {
      doResolve(false);
    }
  };

  return (
    <section className="edit-block">
      <h4>Resolver / Guardar como conocimiento</h4>
      <textarea
        className="textarea"
        rows={4}
        placeholder="Redacta la resolución para esta consulta…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
      />

      <label className="board-filter-check" style={{ marginTop: 'var(--space-2)' }}>
        <input type="checkbox" checked={convert} onChange={(e) => setConvert(e.target.checked)} disabled={busy} />
        Publicar como conocimiento (resolución interna de RR. HH.)
      </label>

      {convert && (
        <div className="reassign" style={{ marginTop: 'var(--space-2)' }}>
          <select className="select" value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={busy}>
            <option value="">Tema… (recomendado)</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}
      {convert && !topicId && (
        <p className="notice">
          <span aria-hidden="true">⚠</span>
          Sin tema, la verja de conflicto bloquea por ámbito completo (sobreprotege). Asigna un tema para afinarla.
        </p>
      )}

      {err && <p className="error">{err}</p>}
      {published && <p className="notice notice--neutral">{published}</p>}

      {conflict && (
        <div className="notice">
          <span aria-hidden="true">⛔</span>
          {conflict.message}
          {conflict.conflicts.length > 0 && (
            <ul>
              {conflict.conflicts.map((c) => (<li key={c.uuid}>{c.title}</li>))}
            </ul>
          )}
        </div>
      )}

      <button className={`btn ${convert ? 'btn-warning' : 'btn-primary'}`} onClick={onSubmit} disabled={busy || !text.trim()}>
        {convert ? 'Publicar como conocimiento' : 'Marcar como resuelta'}
      </button>

      {confirming && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirmar ámbito">
          <div className="modal">
            <h4 className="modal-title"><span aria-hidden="true">⚠</span> ¿Publicar e heredar el ámbito del empleado?</h4>
            <p className="modal-body">
              La resolución se publicará como <code>internal_hr_ruling</code> heredando el convenio del empleado
              (territorio y sector incluidos) y pasará a responder a otras personas de ese ámbito. No puede prevalecer
              sobre un convenio oficial vigente para el mismo ámbito y tema (se bloqueará si lo hace).
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>Cancelar</button>
              <button className="btn btn-warning" onClick={() => doResolve(true)} disabled={busy}>Confirmar y publicar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function EventsLog({ events }: { events: EscalationDetail['events'] }) {
  if (events.length === 0) return null;
  return (
    <section>
      <h4>Actividad</h4>
      <ol className="timeline">
        {events.map((e, i) => (
          <li key={i} className="timeline-item">
            <span className={`timeline-dot src-${e.type === 'publish_blocked' ? 'system' : 'admin_manual'}`} aria-hidden="true" />
            <div>
              <div className="timeline-action">
                {e.type.replace(/_/g, ' ')}
                {e.old_value || e.new_value ? <span className="timeline-value"> {e.old_value ?? '—'} → {e.new_value ?? '—'}</span> : null}
              </div>
              {e.note && <div className="timeline-meta">{e.note}</div>}
              <div className="timeline-meta">{e.created_at}{e.actor ? ` · ${e.actor}` : ''}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
