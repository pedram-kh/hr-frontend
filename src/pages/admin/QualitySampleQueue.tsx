import { useEffect, useState } from 'react';
import {
  ApiError,
  canWorkEscalations,
  getQualitySample,
  listQualitySamples,
  reviewQualitySample,
  type QualityFailureKind,
  type QualitySampleDetail,
  type QualitySampleRow,
  type QualityVerdict,
} from '../../lib/api';
import { useAuth } from '../../auth/context';
import { usePaginatedQuery } from '../../lib/usePaginatedQuery';
import { Pager } from './Pager';
import { CitationList } from '../chat/CitationList';
import { TracePanel } from '../chat/TracePanel';

const VERDICT_LABELS: Record<QualityVerdict, string> = {
  correct: 'Correcta',
  partially: 'Parcialmente correcta',
  wrong: 'Incorrecta',
};

const FAILURE_KIND_LABELS: Record<QualityFailureKind, string> = {
  wrong_scope: 'Ámbito incorrecto',
  wrong_figure: 'Cifra incorrecta',
  stale_document: 'Documento obsoleto',
  unclear: 'Poco claro',
  other: 'Otro',
};

// Sprint 8, Step 7 (plan.md §6.3/§6.5, ADR-0030) — the Calidad screen.
// Promoted from a nested ReviewQueuePage tab to its own top-level AdminShell
// view (found live, eyes-on 2026-09-10 — see `AdminShell.tsx`/`canViewQuality`).
// READS are open to any admin (`Sprint8AnalyticsAccessTest::
// test_quality_sample_reads_are_open_to_any_admin` — no view ability
// exists or should exist, ADR-0030 §5); the one review-write action is
// gated by `escalation.work` (server-enforced; this page only hides the
// affordance).
export function QualitySampleQueue() {
  const { identity } = useAuth();
  const canReview = canWorkEscalations(identity);

  const [month, setMonth] = useState('');
  const [unreviewedOnly, setUnreviewedOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { rows, loading, error, meta, setPage, refresh } = usePaginatedQuery<QualitySampleRow>(
    (page) => {
      const params: Record<string, string> = { page: String(page) };
      if (month) params.month = month;
      if (unreviewedOnly) params.unreviewed = 'true';
      return listQualitySamples(params).then((r) => r.samples);
    },
    `${month}|${unreviewedOnly}`,
  );

  return (
    <>
      <p className="muted">
        Muestra mensual estratificada de turnos respondidos (§6.2) — cada fila es un turno REAL que un empleado recibió,
        no un caso sintético. Marcar <strong>Incorrecta</strong> abre una tarjeta de corrección (
        <code>quality_sample_wrong</code>), igual que cualquier otra escalación.
        {' '}
        <span className="muted docs-total">{meta.total} muestra{meta.total === 1 ? '' : 's'}</span>
      </p>
      <div className="reassign">
        <input
          className="input"
          type="text"
          placeholder="Mes (AAAA-MM)…"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ maxWidth: 140 }}
        />
        <label className="checkbox">
          <input type="checkbox" checked={unreviewedOnly} onChange={(e) => setUnreviewedOnly(e.target.checked)} />
          Solo sin revisar
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <table className="docs-table">
          <thead>
            <tr>
              <th>Mes</th><th>Pregunta</th><th>Estrato</th><th>Territorio</th><th>Veredicto</th><th>Revisor</th><th>Tarjeta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.uuid} className={selected === r.uuid ? 'is-selected' : ''} onClick={() => setSelected(r.uuid)}>
                <td className="muted">{r.sampled_for_month}</td>
                <td className="cell-clip">{r.message?.content ?? '—'}</td>
                <td className="muted small">{r.stratum_path ?? 'prose'}</td>
                <td className="muted small">{r.stratum_territory?.name ?? 'nacional'}</td>
                <td>
                  {r.verdict ? (
                    <span className={`badge ${r.verdict === 'wrong' ? 'badge-conflict' : r.verdict === 'partially' ? 'badge-review' : 'badge-verified'}`}>
                      {VERDICT_LABELS[r.verdict]}
                    </span>
                  ) : (
                    <span className="badge badge-review">Sin revisar</span>
                  )}
                </td>
                <td className="muted small">{r.reviewed_by_admin?.full_name ?? '—'}</td>
                <td className="muted small">{r.escalation_card ? `#${r.escalation_card.id}` : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="col-empty">No hay muestras para este filtro. (Ejecuta <code>php artisan quality:sample</code> para generar la del mes.)</td></tr>
            )}
          </tbody>
        </table>
      )}
      <Pager meta={meta} setPage={setPage} />
      {selected && (
        <QualitySampleDrawer
          uuid={selected}
          canReview={canReview}
          onClose={() => setSelected(null)}
          onChanged={refresh}
        />
      )}
    </>
  );
}

function QualitySampleDrawer({
  uuid,
  canReview,
  onClose,
  onChanged,
}: {
  uuid: string;
  canReview: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<QualitySampleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<QualityVerdict | ''>('');
  const [failureKind, setFailureKind] = useState<QualityFailureKind | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    getQualitySample(uuid)
      .then((d) => {
        setDetail(d);
        setVerdict(d.sample.verdict ?? '');
        setFailureKind(d.sample.failure_kind ?? '');
        setNote(d.sample.note ?? '');
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));
  };
  useEffect(load, [uuid]);

  const submit = async () => {
    if (!verdict) return;
    if (verdict !== 'correct' && !failureKind) {
      setError('Selecciona un motivo de fallo.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await reviewQualitySample(uuid, {
        verdict,
        failure_kind: verdict === 'correct' ? null : (failureKind as QualityFailureKind),
        note: note || null,
      });
      load();
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (error && !detail) {
    return (
      <div className="detail-backdrop" onClick={onClose}>
        <aside className="detail panel" onClick={(e) => e.stopPropagation()}>
          <div className="detail-head"><strong>Muestra de calidad</strong><button className="btn btn-ghost" onClick={onClose}>✕</button></div>
          <div className="detail-body"><p className="error">{error}</p></div>
        </aside>
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="detail-backdrop" onClick={onClose}>
        <aside className="detail panel" onClick={(e) => e.stopPropagation()}>
          <div className="detail-head"><strong>Muestra de calidad</strong><button className="btn btn-ghost" onClick={onClose}>✕</button></div>
          <div className="detail-body"><p className="muted">Loading…</p></div>
        </aside>
      </div>
    );
  }

  const { sample, conversation, reviewer_barred: reviewerBarred } = detail;

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <aside className="detail panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="detail-head">
          <strong>Muestra de calidad · {sample.sampled_for_month}</strong>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="detail-body">
          <dl className="kv">
            <dt>Estrato</dt><dd>{sample.stratum_path ?? 'prose'} · {sample.stratum_territory?.name ?? 'nacional'}</dd>
            <dt>Semilla</dt><dd>{sample.seed}</dd>
            {sample.escalation_card && (<><dt>Tarjeta de corrección</dt><dd>#{sample.escalation_card.id}</dd></>)}
          </dl>

          <section>
            <h4>Conversación</h4>
            <div className="card-convo">
              {conversation.map((m) => (
                <div key={m.id} className={`chat-row ${m.role === 'user' ? 'chat-row--user' : 'chat-row--assistant'}`}>
                  {m.role === 'user' ? (
                    <div className="chat-bubble chat-bubble--user">{m.content}</div>
                  ) : m.role === 'hr_agent' ? (
                    <div className="card chat-bubble chat-bubble--assistant chat-bubble--agent">
                      <span className="badge badge-agent">Respuesta de {m.author_label ?? 'Recursos Humanos'} (persona)</span>
                      <p className="answer-prose">{m.content}</p>
                    </div>
                  ) : (
                    <div className={`card chat-bubble chat-bubble--assistant ${m.escalated ? 'escalation' : ''}`}>
                      {m.escalated && <span className="badge badge-review">Escalado a Recursos Humanos</span>}
                      <p className="answer-prose">{m.content}</p>
                      <CitationList citations={m.citations} />
                      {m.trace && <TracePanel trace={m.trace} />}
                    </div>
                  )}
                </div>
              ))}
              {conversation.length === 0 && <p className="muted">Sin conversación asociada.</p>}
            </div>
          </section>

          <section className="edit-block">
            <h4>Revisión</h4>
            {!canReview && (
              <p className="notice notice--neutral">
                <span aria-hidden="true">🔒</span>
                Solo lectura — se requiere <code>escalation.work</code> para registrar un veredicto.
              </p>
            )}
            {canReview && reviewerBarred && (
              <p className="notice">
                <span aria-hidden="true">⚠</span>
                No puedes revisar esta muestra: estás asignado a una tarjeta de escalación de la misma sesión (§6.3).
              </p>
            )}
            {canReview && !reviewerBarred && (
              <>
                <div className="reassign">
                  {(['correct', 'partially', 'wrong'] as QualityVerdict[]).map((v) => (
                    <button
                      key={v}
                      className={`btn ${verdict === v ? 'btn-primary' : 'btn-ghost'}`}
                      disabled={busy}
                      onClick={() => setVerdict(v)}
                    >
                      {VERDICT_LABELS[v]}
                    </button>
                  ))}
                </div>
                {verdict && verdict !== 'correct' && (
                  <select
                    className="select"
                    value={failureKind}
                    onChange={(e) => setFailureKind(e.target.value as QualityFailureKind)}
                    disabled={busy}
                    style={{ marginTop: 'var(--space-2)' }}
                  >
                    <option value="">Motivo de fallo…</option>
                    {(Object.keys(FAILURE_KIND_LABELS) as QualityFailureKind[]).map((k) => (
                      <option key={k} value={k}>{FAILURE_KIND_LABELS[k]}</option>
                    ))}
                  </select>
                )}
                <textarea
                  className="textarea"
                  rows={3}
                  placeholder="Nota (opcional)…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={busy}
                  style={{ marginTop: 'var(--space-2)' }}
                />
                {error && <p className="error">{error}</p>}
                <button className="btn btn-primary" onClick={submit} disabled={busy || !verdict}>
                  {busy ? 'Guardando…' : 'Guardar veredicto'}
                </button>
              </>
            )}
            {sample.verdict && (
              <p className="timeline-meta">
                Ya revisada por {sample.reviewed_by_admin?.full_name ?? '—'} el {sample.reviewed_at ?? '—'} — guardar de nuevo sobrescribe el veredicto.
              </p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
