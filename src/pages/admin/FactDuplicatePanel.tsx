import { useEffect, useState, type ReactNode } from 'react';
import {
  ApiError,
  canEditKnowledge,
  getFactDuplicatePair,
  resolveFactDuplicate,
  type FactDuplicatePair,
  type FactPairSide,
} from '../../lib/api';
import { useAuth } from '../../auth/context';

/**
 * The fact VERSION resolution surface (Sprint 7d, ADR-0024, part B).
 *
 * Sprint 7b-2 could only FLAG that two facts in the same scope disagree; the
 * reviewer had nowhere to say which is true. This is that surface: the two facts
 * side by side with the differing fields marked, and the three human verdicts.
 *
 * ── The three actions, and why they are worded as they are ──────────────────
 *  · SUSTITUIR (supersede) — one is a NEWER VERSION of the other. The older
 *    fact's validity window CLOSES the day before the newer one starts; both
 *    stay `verified`, and NOTHING IS DELETED, so a question dated inside the old
 *    window still gets the answer that was true then. It needs a direction, and
 *    only the validity dates can justify one — hence the server-computed
 *    `supersede_candidate`, which the UI pre-selects and never infers itself.
 *  · COEXISTEN — they are not versions: different groups, different subjects.
 *    Both stay answerable, and the flag stops asking.
 *  · DESCARTAR — one is wrong (a mis-segmentation). It becomes `rejected`, which
 *    is not answerable. Never offered for a fact a human already verified.
 *
 * Every action is human-invoked, append-only in `tag_events`, and reaches the
 * answer path through the DATA ONLY — the 7c answer rule is untouched.
 */
export function FactDuplicatePanel({
  uuid,
  onClose,
  onChanged,
}: {
  uuid: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { identity } = useAuth();
  const canEdit = canEditKnowledge(identity);
  const [pair, setPair] = useState<FactDuplicatePair | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newerUuid, setNewerUuid] = useState('');
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState<'supersede' | 'coexist' | 'reject' | null>(null);

  const load = () => {
    getFactDuplicatePair(uuid)
      .then((p) => {
        setPair(p);
        // Pre-select the direction the dates support. Pre-selecting is not
        // deciding: the human still has to press Sustituir, and can flip it.
        if (p.supersede_candidate.possible) setNewerUuid(p.supersede_candidate.newer_uuid);
      })
      .catch((e) => setError(String(e.message ?? e)));
  };
  useEffect(load, [uuid]);

  const act = async (action: 'supersede' | 'coexist' | 'reject') => {
    setBusy(true);
    setError(null);
    try {
      await resolveFactDuplicate(uuid, {
        action,
        newer_uuid: action === 'supersede' ? newerUuid : undefined,
        note: note.trim() || undefined,
      });
      setConfirming(null);
      setMsg(
        action === 'supersede'
          ? 'Sustituido — la vigencia del hecho anterior se ha cerrado. Ninguno se ha borrado.'
          : action === 'coexist'
            ? 'Marcados como coexistentes — ambos siguen siendo respondibles.'
            : 'Descartado como duplicado — deja de ser respondible.',
      );
      load();
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? String(e.body?.message ?? e.message) : String((e as Error).message ?? e));
      setConfirming(null);
    } finally {
      setBusy(false);
    }
  };

  const shell = (body: ReactNode) => (
    <div className="detail-backdrop" onClick={onClose}>
      <aside className="detail panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Resolver versión">
        <div className="detail-head">
          <strong>Resolver versión</strong>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="detail-body">{body}</div>
      </aside>
    </div>
  );

  if (error && !pair) return shell(<p className="error">{error}</p>);
  if (!pair) return shell(<p className="muted">Cargando…</p>);

  const [a, b] = pair.pair;
  const direction = pair.supersede_candidate;
  const older = direction.possible ? pair.pair.find((f) => f.uuid === direction.older_uuid) : undefined;

  return shell(
    <>
      {!canEdit && (
        <p className="notice notice--neutral">
          <span aria-hidden="true">🔒</span>
          Solo lectura — necesitas <code>knowledge.edit</code> para resolver una versión.
        </p>
      )}

      {pair.resolved ? (
        <p className="notice notice--neutral">
          <span aria-hidden="true">✓</span>
          Este par ya está resuelto. El enlace se conserva como linaje de versiones; nada se ha borrado.
        </p>
      ) : (
        <div className="notice">
          <span aria-hidden="true">⚠</span>
          <div className="notice-body">
            Dos hechos del mismo ámbito y tema con valores distintos. Decide si uno <strong>sustituye</strong> al
            otro (una versión posterior), si <strong>coexisten</strong> (no son versiones) o si uno es
            <strong> incorrecto</strong>. Sustituir cierra la vigencia del anterior y <strong>no borra nada</strong>:
            una pregunta con fecha antigua seguirá obteniendo el valor que era cierto entonces.
          </div>
        </div>
      )}

      {msg && <p className="notice notice--neutral">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="compare-grid">
        <PairSide side={a} differing={pair.differing_fields} isNewer={newerUuid === a.uuid} />
        <PairSide side={b} differing={pair.differing_fields} isNewer={newerUuid === b.uuid} />
      </div>

      {canEdit && !pair.resolved && (
        <section>
          <h4>Resolver</h4>

          {direction.possible ? (
            <>
              <p className="muted">
                ¿Cuál es la versión posterior? Se cerrará la vigencia de la otra el{' '}
                <strong>{direction.would_close_older_at}</strong>
                {older ? ` (${older.value})` : ''}.
              </p>
              <div className="propose-vocab-choice">
                {pair.pair.map((f) => (
                  <label className="radio" key={f.uuid}>
                    <input
                      type="radio"
                      name="newer"
                      value={f.uuid}
                      checked={newerUuid === f.uuid}
                      onChange={() => setNewerUuid(f.uuid)}
                      disabled={busy}
                    />
                    <span>
                      {f.value} <span className="muted">· desde {f.validity_start ?? '—'}</span>
                    </span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <p className="notice">
              <span aria-hidden="true">⚠</span>
              {direction.reason}
            </p>
          )}

          <label className="field" style={{ marginTop: 'var(--space-3)' }}>
            <span className="label">Nota (queda en la provenencia)</span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} />
          </label>

          <div className="proposal-actions">
            <button
              className="btn btn-primary"
              disabled={busy || !direction.possible || !newerUuid}
              onClick={() => setConfirming('supersede')}
            >
              Sustituir (cerrar vigencia de la anterior)
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => setConfirming('coexist')}>
              Coexisten (no son versiones)
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => setConfirming('reject')}>
              Descartar este hecho
            </button>
          </div>
        </section>
      )}

      {confirming && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirmar resolución">
          <div className="modal">
            <h4 className="modal-title"><span aria-hidden="true">⚠</span> Confirmar</h4>
            <p className="modal-body">
              {confirming === 'supersede' &&
                `Se cerrará la vigencia del hecho anterior el ${
                  direction.possible ? direction.would_close_older_at : '—'
                }. Ambos hechos se conservan verificados: el anterior seguirá respondiendo a preguntas fechadas en su periodo.`}
              {confirming === 'coexist' &&
                'Los dos hechos se marcarán como coexistentes. Ambos siguen siendo respondibles y la marca de versión deja de pedir atención.'}
              {confirming === 'reject' &&
                'Este hecho pasará a rechazado y dejará de ser respondible. No se borra: queda con su provenencia para auditoría.'}
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirming(null)} disabled={busy}>Cancelar</button>
              <button className="btn btn-warning" onClick={() => act(confirming)} disabled={busy}>
                {busy ? 'Aplicando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
  );
}

// One side of the comparison. The DIFFERING fields are marked; the identical ones
// stay visible but quiet — the shared scope is what proves these two really are
// two versions of the same fact rather than two different facts.
function PairSide({ side, differing, isNewer }: { side: FactPairSide; differing: string[]; isNewer: boolean }) {
  const field = (key: string, label: string, value: string | null) => (
    <div className={`compare-field ${differing.includes(key) ? 'is-differing' : ''}`}>
      <dt>{label}</dt>
      <dd>{value ?? '—'}</dd>
    </div>
  );

  return (
    <div className={`compare-side ${side.source === 'ai_agent' && side.status === 'needs_review' ? 'ai-marked' : ''}`}>
      <div className="proposal-head">
        <strong className="fact-value">{side.value}</strong>
        {isNewer && <span className="badge badge-verified">más reciente</span>}
        {side.status === 'verified' && <span className="badge badge-verified">verificado</span>}
        {side.status === 'needs_review' && <span className="badge badge-review">sin verificar</span>}
        {side.status === 'rejected' && <span className="badge badge-review">rechazado</span>}
        {side.resolution && <span className="badge badge-historical">{side.resolution}</span>}
      </div>
      <dl style={{ margin: 0 }}>
        {field('group_label', 'Grupo (tal cual)', side.group_label)}
        {field('job_category', 'Categoría', side.job_category)}
        {field('topic', 'Tema', side.topic)}
        {field('validity_start', 'Vigencia desde', side.validity_start)}
        {field('validity_end', 'Vigencia hasta', side.validity_end)}
        {field('convenio', 'Convenio', side.convenio_name ?? side.convenio)}
      </dl>
      {side.source_excerpt && (
        <>
          <span className="muted">Línea de origen</span>
          <blockquote className="well passage-text">{side.source_excerpt}</blockquote>
        </>
      )}
      {side.source_document && (
        <p className="timeline-meta">
          {side.source_document.source_filename ?? side.source_document.title}
          {side.source_locator ? ` · ${side.source_locator}` : ''}
        </p>
      )}
      {side.resolved_by && (
        <p className="timeline-meta">
          {side.resolution} por {side.resolved_by} · {side.resolved_at}
        </p>
      )}
    </div>
  );
}
