import { useCallback, useEffect, useState } from 'react';
import {
  addTopic,
  canEditKnowledge,
  confirmTags,
  getDocument,
  getDocumentSourceUrl,
  getPageImageUrl,
  getVocabulary,
  reassignFacet,
  removeTopic,
  runSandbox,
  updateLifecycle,
  type ChunkHealth,
  type DocumentDetail,
  type LineageRef,
  type SandboxResult,
  type VocabularyItem,
} from '../../lib/api';
import { useAuth } from '../../auth/context';

// Right-hand document card: scope facets + inline provenance, validity/status,
// chunk health, lineage, the provenance timeline, the real-document viewer, the
// read-only sandbox, and (for knowledge.edit holders) the bounded-edit controls.
export function DocumentDetailPanel({
  uuid,
  onClose,
  onChanged,
  onOpenEscalation,
}: {
  uuid: string;
  onClose: () => void;
  onChanged: () => void;
  onOpenEscalation?: (uuid: string) => void;
}) {
  const { identity } = useAuth();
  const canEdit = canEditKnowledge(identity);
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    getDocument(uuid)
      .then(setDoc)
      .catch((e) => setError(String(e.message ?? e)));
  };

  useEffect(load, [uuid]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (error)
    return (
      <div className="detail-backdrop" onClick={onClose}>
        <div className="detail panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="detail-head">
            <strong>Error</strong>
            <button className="btn btn-ghost" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="detail-body"><p className="error">{error}</p></div>
        </div>
      </div>
    );
  if (!doc)
    return (
      <div className="detail-backdrop" onClick={onClose}>
        <div className="detail panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="detail-head">
            <strong>Loading…</strong>
            <button className="btn btn-ghost" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="detail-body"><p className="muted">Loading…</p></div>
        </div>
      </div>
    );

  const reload = () => {
    load();
    onChanged();
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await confirmTags(uuid);
      reload();
    } finally {
      setBusy(false);
    }
  };

  const suspectedMistag =
    doc.tags.document_type?.code === 'convenio_text' &&
    doc.retrieval_status === 'active' &&
    /tabla/i.test(`${doc.title} ${doc.source_filename ?? ''}`);

  return (
    <div className="detail-backdrop" onClick={onClose}>
    <aside className="detail panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={doc.title}>
      <div className="detail-head">
        <strong>{doc.title}</strong>
        {doc.authority_level === 'internal_hr_ruling' && (
          <span className="badge badge-review">Resolución RR. HH.</span>
        )}
        <button className="btn btn-ghost" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="detail-body">

      {doc.ruling && (
        <p className="notice notice--neutral">
          <span aria-hidden="true">🔁</span>
          Creada desde la escalación <strong>#{doc.ruling.escalation_id}</strong>
          {doc.ruling.agent ? ` por ${doc.ruling.agent}` : ''}.
          {doc.ruling.escalation_uuid && onOpenEscalation && (
            <>
              {' '}
              <button className="btn btn-ghost btn-inline" onClick={() => onOpenEscalation(doc.ruling!.escalation_uuid!)}>
                Ver la tarjeta →
              </button>
            </>
          )}
        </p>
      )}

      {!canEdit && (
        <p className="notice notice--neutral">
          <span aria-hidden="true">🔒</span>
          Read-only — you don't have the <code>knowledge.edit</code> ability. You can browse, inspect, and run the sandbox.
        </p>
      )}

      {doc.is_unscoped && (
        <p className="notice">
          <span aria-hidden="true">⚠</span>
          No convenio — this document carries no scope (scope is derived via the convenio), so employees won't receive it as an answer.
        </p>
      )}

      {doc.empty_text && (
        <p className="notice">
          <span aria-hidden="true">∅</span>
          No extractable text — this looks like a scanned, image-only PDF (no OCR this sprint).
        </p>
      )}

      {suspectedMistag && (
        <p className="notice">
          <span aria-hidden="true">●</span>
          Suspected salary-table mistag: tagged as convenio prose but named like a table.
          {canEdit ? ' Use “Re-type document” below → Tablas salariales.' : ' A knowledge editor can retag this.'}
        </p>
      )}

      <section>
        <h4>Scope</h4>
        <div className="facets">
          <Facet label="Convenio" value={doc.tags.convenio ? `${doc.tags.convenio.numero} — ${doc.tags.convenio.name}` : '—'} />
          <Facet label="Territory" value={doc.tags.territory ? `${doc.tags.territory.name} (${doc.tags.territory.level})` : '—'} derived />
          <Facet label="Sector" value={doc.tags.sector?.name ?? '—'} derived />
          <Facet label="Type" value={doc.tags.document_type?.name ?? '—'} />
          <Facet label="Validity" value={doc.validity_start ? `${doc.validity_start} → ${doc.validity_end ?? '—'}` : '—'} />
        </div>
        <dl className="kv">
          <dt>Retrieval</dt><dd>{doc.retrieval_status}</dd>
          <dt>Authority</dt><dd>{doc.authority_level}</dd>
          <dt>Language</dt><dd>{doc.language}</dd>
          <dt>Status</dt><dd>{doc.tagging_status} ({doc.tagging_confidence ?? '—'})</dd>
        </dl>
      </section>

      <TopicsSection doc={doc} canEdit={canEdit} onChanged={reload} />

      <ChunkHealthSection health={doc.chunk_health} />

      <LineageSection lineage={doc.lineage} />

      {doc.review_tasks.length > 0 && (
        <section>
          <h4>Review tasks</h4>
          {doc.review_tasks.map((t, i) => (
            <div key={i} className={`review-task ${t.reason === 'conflict' ? 'is-conflict' : 'is-unresolved'}`}>
              <strong>{t.reason ?? t.type}</strong> · {t.status}
              {t.raw_unmatched_values && t.raw_unmatched_values.length > 0 && (
                <ul>
                  {t.raw_unmatched_values.map((rv, j) => (
                    <li key={j}><code>{rv.facet}</code>: {rv.value}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {canEdit && <EditControls doc={doc} suspectedMistag={suspectedMistag} onChanged={reload} />}

      {canEdit && (
        <section className="actions">
          <button
            className="btn btn-primary"
            onClick={confirm}
            disabled={busy || doc.tagging_status === 'verified'}
          >
            {doc.tagging_status === 'verified' ? 'Tags confirmed ✓' : 'Confirm tags'}
          </button>
        </section>
      )}

      <section>
        <h4>Provenance</h4>
        <ol className="timeline">
          {doc.provenance.map((e, i) => (
            <li key={i} className="timeline-item">
              <span className={`timeline-dot src-${e.source}`} aria-hidden="true" />
              <div>
                <span className="timeline-action">
                  {e.source.replace(/_/g, ' ')} · <code>{e.facet}</code>
                  {e.old_value ? <span className="timeline-old"> {e.old_value} →</span> : null}
                  {e.new_value ? (
                    <>
                      {' '}
                      <span className="timeline-value">{e.new_value}</span>
                    </>
                  ) : e.old_value ? <span className="timeline-value"> (removed)</span> : null}
                </span>
                {e.note ? <div className="timeline-meta">{e.note}</div> : null}
                <div className="timeline-meta">{e.created_at}{e.actor_id ? ` · admin #${e.actor_id}` : ''}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <SourceViewer uuid={uuid} />

      <SandboxPanel uuid={uuid} title={doc.title} />

      {doc.pages.length > 0 && (
        <section>
          <h4>Source pages ({doc.pages.length})</h4>
          <PaginatedPageViewer uuid={uuid} pages={doc.pages} />
        </section>
      )}
      </div>
    </aside>
    </div>
  );
}

function Facet({ label, value, derived }: { label: string; value: string; derived?: boolean }) {
  return (
    <span className="facet">
      <span className="facet-label">
        {label}
        {derived && <span className="facet-derived" title="Derived from the convenio — not editable"> (derived)</span>}
      </span>
      <span className="facet-value">{value}</span>
    </span>
  );
}

// -----------------------------------------------------------------------------
// Topics — current tags + provenance source; add/remove for editors
// -----------------------------------------------------------------------------

function TopicsSection({ doc, canEdit, onChanged }: { doc: DocumentDetail; canEdit: boolean; onChanged: () => void }) {
  const [options, setOptions] = useState<VocabularyItem[]>([]);
  const [add, setAdd] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (canEdit) getVocabulary('topics').then((r) => setOptions(r.items)).catch(() => setOptions([]));
  }, [canEdit]);

  const applied = new Set(doc.topics.map((t) => t.id));
  const pickable = options.filter((o) => !applied.has(o.id));

  const onAdd = async () => {
    if (!add) return;
    setBusy(true);
    try {
      await addTopic(doc.uuid, Number(add));
      setAdd('');
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (topicId: number) => {
    setBusy(true);
    try {
      await removeTopic(doc.uuid, topicId);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h4>Topics</h4>
      {doc.topics.length === 0 ? (
        <p className="muted">No topics tagged yet — topic tagging arrives with the AI tier (Sprint 7); a human can tag now.</p>
      ) : (
        <div className="facets">
          {doc.topics.map((t) => (
            <span key={t.id} className="chip">
              <span className={`timeline-dot src-${t.source}`} aria-hidden="true" /> {t.name}
              {canEdit && (
                <button className="chip-x" onClick={() => onRemove(t.id)} disabled={busy} aria-label={`Remove ${t.name}`}>
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {canEdit && (
        <div className="reassign" style={{ marginTop: 'var(--space-2)' }}>
          <select className="select" value={add} onChange={(e) => setAdd(e.target.value)}>
            <option value="">Add a topic…</option>
            {pickable.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={onAdd} disabled={busy || !add}>Add topic</button>
        </div>
      )}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Chunk health (resolved Q5: no es/eu split)
// -----------------------------------------------------------------------------

function ChunkHealthSection({ health }: { health: ChunkHealth }) {
  return (
    <section>
      <h4>Chunk health</h4>
      {health.zero_chunks ? (
        <p className="notice">
          <span aria-hidden="true">∅</span>
          0 chunks — this document is not retrievable (unanswerable until re-chunked; re-chunking is not a Knowledge-Center action).
        </p>
      ) : (
        <dl className="kv">
          <dt>Chunks</dt><dd>{health.chunk_count}</dd>
          <dt>Tokens</dt><dd>{health.token_total.toLocaleString()}</dd>
          <dt>Pages</dt><dd>{health.first_page ?? '—'}–{health.last_page ?? '—'}</dd>
          <dt>Embeddings</dt><dd>{health.has_embeddings ? 'present' : 'missing'}</dd>
        </dl>
      )}
      <p className="timeline-meta">{health.note}</p>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Lineage (predecessor / successors)
// -----------------------------------------------------------------------------

function LineageRow({ item, rel }: { item: LineageRef; rel: string }) {
  return (
    <div className="lineage-row">
      <span className="lineage-rel">{rel}</span>
      <span className="lineage-title">{item.title}</span>
      <span className={`badge badge-${item.retrieval_status === 'active' ? 'verified' : 'historical'}`}>{item.retrieval_status}</span>
      <span className="timeline-meta">{item.validity_start ?? '—'} → {item.validity_end ?? '—'}</span>
    </div>
  );
}

function LineageSection({ lineage }: { lineage: { predecessor: LineageRef | null; successors: LineageRef[] } }) {
  if (!lineage.predecessor && lineage.successors.length === 0) return null;
  return (
    <section>
      <h4>Lineage</h4>
      {lineage.predecessor && <LineageRow item={lineage.predecessor} rel="supersedes" />}
      {lineage.successors.map((s) => <LineageRow key={s.uuid} item={s} rel="superseded by" />)}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Bounded edit — FK pickers + scope-warning modal (knowledge.edit only)
// -----------------------------------------------------------------------------

function EditControls({ doc, suspectedMistag, onChanged }: { doc: DocumentDetail; suspectedMistag: boolean; onChanged: () => void }) {
  return (
    <section className="edit-block">
      <h4>Edit labels</h4>
      <p className="timeline-meta">Bounded edit (FK pickers into existing vocabulary). Territory & sector are derived from the convenio and not editable. Every save appends append-only human provenance.</p>
      <ReassignControls doc={doc} suspectedMistag={suspectedMistag} onChanged={onChanged} />
      <LifecycleControls doc={doc} onChanged={onChanged} />
    </section>
  );
}

function ReassignControls({ doc, suspectedMistag, onChanged }: { doc: DocumentDetail; suspectedMistag: boolean; onChanged: () => void }) {
  const [facet, setFacet] = useState<'convenio' | 'document_type'>('convenio');
  const [options, setOptions] = useState<VocabularyItem[]>([]);
  const [valueId, setValueId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<null | { title: string; body: string }>(null);

  useEffect(() => {
    const type = facet === 'convenio' ? 'convenios' : 'document_types';
    getVocabulary(type).then((r) => setOptions(r.items));
  }, [facet]);

  const onFacetChange = (next: 'convenio' | 'document_type') => {
    setFacet(next);
    setValueId('');
  };

  // A convenio reassign always re-scopes; a document_type change to salary_tables
  // moves the doc to the SQL/salary path (behavior-affecting). Both warn first.
  const selectedOption = options.find((o) => String(o.id) === valueId);
  const toSalaryTable = facet === 'document_type' && selectedOption?.code === 'salary_tables';
  const needsConfirm = facet === 'convenio' || toSalaryTable;

  const doApply = async () => {
    setBusy(true);
    try {
      await reassignFacet(doc.uuid, facet, Number(valueId), facet === 'convenio');
      setPending(null);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const onApplyClick = () => {
    if (!valueId) return;
    if (needsConfirm) {
      setPending({
        title: facet === 'convenio' ? 'Re-scope this document?' : 'Re-type to a salary table?',
        body:
          facet === 'convenio'
            ? 'Changing the convenio changes the document’s derived territory + sector — i.e. which employees receive it as an answer. This appends human provenance and cannot rewrite history.'
            : 'Marking this as a salary table moves it off the prose answer path onto the structured salary (SQL) path, and removes it from convenio-prose retrieval. This appends human provenance.',
      });
    } else {
      doApply();
    }
  };

  return (
    <>
      <div className="reassign">
        <select className="select" value={facet} onChange={(e) => onFacetChange(e.target.value as 'convenio' | 'document_type')}>
          <option value="convenio">Re-scope convenio</option>
          <option value="document_type">Re-type document</option>
        </select>
        <select className="select" value={valueId} onChange={(e) => setValueId(e.target.value)}>
          <option value="">Select a value…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {facet === 'convenio' ? `${o.numero} — ${o.name}` : o.name}
            </option>
          ))}
        </select>
        <button className={`btn ${needsConfirm ? 'btn-warning' : 'btn-secondary'}`} onClick={onApplyClick} disabled={busy || !valueId}>
          {facet === 'document_type' && suspectedMistag ? 'Retag' : 'Apply'}
        </button>
      </div>
      {pending && (
        <ScopeWarningModal
          title={pending.title}
          body={pending.body}
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={doApply}
        />
      )}
    </>
  );
}

function LifecycleControls({ doc, onChanged }: { doc: DocumentDetail; onChanged: () => void }) {
  const [retrieval, setRetrieval] = useState(doc.retrieval_status);
  const [tagging, setTagging] = useState(doc.tagging_status);
  const [vStart, setVStart] = useState(doc.validity_start ?? '');
  const [vEnd, setVEnd] = useState(doc.validity_end ?? '');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);

  const retrievalChanged = retrieval !== doc.retrieval_status;
  const validityChanged = (vStart || '') !== (doc.validity_start ?? '') || (vEnd || '') !== (doc.validity_end ?? '');
  const taggingChanged = tagging !== doc.tagging_status;
  const dirty = retrievalChanged || validityChanged || taggingChanged;
  const scopeAffecting = retrievalChanged || validityChanged;

  const save = async (confirm: boolean) => {
    setBusy(true);
    try {
      await updateLifecycle(doc.uuid, {
        retrieval_status: retrievalChanged ? retrieval : undefined,
        tagging_status: taggingChanged ? tagging : undefined,
        validity_start: validityChanged ? (vStart || null) : undefined,
        validity_end: validityChanged ? (vEnd || null) : undefined,
        confirm_scope_change: confirm,
      });
      setPending(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const onSaveClick = () => {
    if (!dirty) return;
    if (scopeAffecting) setPending(true);
    else save(false);
  };

  return (
    <div className="lifecycle-edit">
      <div className="lifecycle-grid">
        <label>Retrieval
          <select className="select" value={retrieval} onChange={(e) => setRetrieval(e.target.value)}>
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="historical">historical</option>
          </select>
        </label>
        <label>Tagging
          <select className="select" value={tagging} onChange={(e) => setTagging(e.target.value)}>
            <option value="auto_proposed">auto_proposed</option>
            <option value="under_review">under_review</option>
            <option value="verified">verified</option>
          </select>
        </label>
        <label>Valid from
          <input className="input" type="date" value={vStart} onChange={(e) => setVStart(e.target.value)} />
        </label>
        <label>Valid to
          <input className="input" type="date" value={vEnd} onChange={(e) => setVEnd(e.target.value)} />
        </label>
      </div>
      <button className={`btn ${scopeAffecting ? 'btn-warning' : 'btn-secondary'}`} onClick={onSaveClick} disabled={busy || !dirty}>
        Save lifecycle{scopeAffecting ? ' (scope-affecting)' : ''}
      </button>
      {pending && (
        <ScopeWarningModal
          title="Scope-affecting change"
          body="Changing the retrieval status or validity window moves the eligibility window — which employees receive this document as an answer. This appends human provenance and cannot rewrite history."
          busy={busy}
          onCancel={() => setPending(false)}
          onConfirm={() => save(true)}
        />
      )}
    </div>
  );
}

function ScopeWarningModal({
  title,
  body,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <h4 className="modal-title"><span aria-hidden="true">⚠</span> {title}</h4>
        <p className="modal-body">{body}</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="btn btn-warning" onClick={onConfirm} disabled={busy}>Confirm change</button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Real-document viewer (presigned S3 source)
// -----------------------------------------------------------------------------

function SourceViewer({ uuid }: { uuid: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onToggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !url) {
      try {
        const r = await getDocumentSourceUrl(uuid);
        setUrl(r.url);
        setType(r.content_type);
      } catch (e) {
        setErr(String((e as Error).message ?? e));
      }
    }
  };

  return (
    <section>
      <h4>Original document</h4>
      <button className="btn btn-secondary" onClick={onToggle}>{open ? 'Hide source' : 'View original'}</button>
      {open && err && <p className="error">{err}</p>}
      {open && url && (
        type === 'application/pdf' ? (
          <object data={url} type="application/pdf" className="source-frame" aria-label="Original PDF">
            <p className="muted">Can’t embed inline — <a href={url} target="_blank" rel="noreferrer">open the file</a>.</p>
          </object>
        ) : (
          <p className="muted"><a href={url} target="_blank" rel="noreferrer">Download / open the original file</a></p>
        )
      )}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Read-only sandbox — test a question against THIS document (persists nothing)
// -----------------------------------------------------------------------------

function SandboxPanel({ uuid, title }: { uuid: string; title: string }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<SandboxResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    if (!q.trim()) return;
    setBusy(true);
    setErr(null);
    setRes(null);
    try {
      setRes(await runSandbox(uuid, q.trim()));
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const outcome = res?.trace.outcome;
  const draft = res?.trace.draft_answer;
  const grounding = res?.trace.grounding;

  return (
    <section className="sandbox">
      <h4>Sandbox <span className="sandbox-tag">read-only · persists nothing</span></h4>
      <p className="timeline-meta">Run the answer pipeline against “{title}” only. Same gates as production; no chat, no escalation is saved.</p>
      <div className="reassign">
        <input
          className="input"
          placeholder="e.g. ¿cuántos días de vacaciones tengo?"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
        />
        <button className="btn btn-primary" onClick={run} disabled={busy || !q.trim()}>{busy ? 'Running…' : 'Test'}</button>
      </div>
      {err && <p className="error">{err}</p>}
      {res && (
        <div className={`sandbox-result ${outcome === 'answer' ? 'is-answer' : 'is-escalate'}`}>
          <div className="sandbox-outcome">
            <span className={`badge ${outcome === 'answer' ? 'badge-verified' : 'badge-review'}`}>{outcome ?? 'result'}</span>
            {res.trace.retrieval && <span className="timeline-meta"> retrieved {res.trace.retrieval.returned} · top {res.trace.retrieval.top_score?.toFixed?.(3)}</span>}
          </div>
          <p className="sandbox-answer">{res.answer}</p>
          {res.citations.length > 0 && (
            <ul className="sandbox-cites">
              {res.citations.map((c, i) => (
                <li key={i}>[{i + 1}] p.{c.page_from ?? '—'}{c.page_to && c.page_to !== c.page_from ? `–${c.page_to}` : ''}: {c.snippet}</li>
              ))}
            </ul>
          )}
          {outcome !== 'answer' && draft && (
            <details className="sandbox-draft">
              <summary>Draft the model produced (not served)</summary>
              <p>{draft}</p>
              {grounding?.ungrounded && grounding.ungrounded.length > 0 && (
                <p className="timeline-meta">Stopped by the grounding gate — ungrounded: {grounding.ungrounded.join('; ')}</p>
              )}
            </details>
          )}
        </div>
      )}
    </section>
  );
}

function PaginatedPageViewer({
  uuid,
  pages,
}: {
  uuid: string;
  pages: { page_number: number; text: string; has_text: boolean }[];
}) {
  const [idx, setIdx] = useState(0);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);

  const page = pages[idx];
  const total = pages.length;

  const loadImage = useCallback((pageNum: number) => {
    setImgUrl(null);
    setImgLoading(true);
    getPageImageUrl(uuid, pageNum)
      .then((r) => setImgUrl(r.url))
      .catch(() => setImgUrl(null))
      .finally(() => setImgLoading(false));
  }, [uuid]);

  useEffect(() => { loadImage(page.page_number); }, [page.page_number, loadImage]);

  const go = (next: number) => { setIdx(Math.max(0, Math.min(total - 1, next))); };

  return (
    <div className="page-viewer">
      <div className="page-viewer-nav">
        <button className="btn btn-secondary" onClick={() => go(idx - 1)} disabled={idx === 0}>← Anterior</button>
        <span className="page-counter">Página {page.page_number} de {total}</span>
        <button className="btn btn-secondary" onClick={() => go(idx + 1)} disabled={idx === total - 1}>Siguiente →</button>
      </div>
      <div className="page-viewer-content">
        <div className="page-viewer-img">
          {imgLoading && <p className="muted">Cargando imagen…</p>}
          {!imgLoading && imgUrl && <img src={imgUrl} alt={`Página ${page.page_number}`} />}
          {!imgLoading && !imgUrl && <p className="muted">(sin imagen)</p>}
        </div>
        <div className="page-viewer-text">
          <pre className="well">{page.text || '(sin texto extraíble)'}</pre>
        </div>
      </div>
    </div>
  );
}
