import { useCallback, useEffect, useRef, useState } from 'react';
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
  resuggestTags,
  runSandbox,
  updateLifecycle,
  type ChunkHealth,
  type DocumentDetail,
  type LineageRef,
  type ProvenanceEvent,
  type SandboxResult,
  type VocabularyFacet,
  type VocabularyItem,
} from '../../lib/api';
import { useAuth } from '../../auth/context';
import { ProposeVocabularyForm } from './ProposeVocabularyForm';
import { retrievalStatusLabel, taggingStatusLabel } from '../../lib/statusLabels';
import { useT, useLocale } from '../../i18n/context';

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
  const t = useT();
  const canEdit = canEditKnowledge(identity);
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Inline notice near the Re-suggest button (softer than the full-panel error state).
  const [suggestNotice, setSuggestNotice] = useState<string | null>(null);
  const pollCancelRef = useRef<(() => void) | null>(null);

  const load = () => {
    getDocument(uuid)
      .then(setDoc)
      .catch((e) => setError(String(e.message ?? e)));
  };

  useEffect(load, [uuid]);

  // Cancel any in-flight re-suggest poll when the doc changes or the panel closes.
  useEffect(() => () => pollCancelRef.current?.(), [uuid]);

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
            <strong>{t.common.error}</strong>
            <button className="btn btn-ghost" onClick={onClose} aria-label={t.documentDetail.close}>✕</button>
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
            <strong>{t.documentDetail.loadingTitle}</strong>
            <button className="btn btn-ghost" onClick={onClose} aria-label={t.documentDetail.close}>✕</button>
          </div>
          <div className="detail-body"><p className="muted">{t.documentDetail.loadingTitle}</p></div>
        </div>
      </div>
    );

  const reload = () => {
    load();
    onChanged();
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await confirmTags(uuid);
      reload();
    } catch (e) {
      setError(`${t.documentDetail.confirmFailedPrefix}${(e as Error).message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  const aiEventCount = (d: DocumentDetail) =>
    d.provenance.filter((e) => e.source === 'ai_agent').length;

  const resuggest = async () => {
    // Scans with no extractable text are skipped by the tagging service.
    // Show an inline notice rather than taking over the whole panel.
    if (doc?.empty_text) {
      setSuggestNotice(t.documentDetail.scanNoTextNotice);
      return;
    }
    setSuggestNotice(null);
    setBusy(true);
    setError(null);
    // tag_events is append-only, so a successful new proposal strictly raises
    // the ai_agent provenance count. Snapshot it, then poll until it grows.
    const before = doc ? aiEventCount(doc) : 0;
    try {
      await resuggestTags(uuid);
    } catch (e) {
      setError(String((e as Error).message ?? e));
      setBusy(false);
      return;
    }
    setBusy(false);
    // The proposal runs on the queue (real Claude call ~10s). Poll every 2s and
    // surface the fuchsia facets the moment the ai_agent count grows.
    setProposing(true);
    let cancelled = false;
    const deadline = Date.now() + 30_000;
    const poll = async () => {
      if (cancelled) return;
      try {
        const fresh = await getDocument(uuid);
        if (aiEventCount(fresh) > before) {
          setDoc(fresh);
          onChanged();
          setProposing(false);
          return;
        }
      } catch {
        // transient — keep polling until the deadline
      }
      if (Date.now() < deadline) {
        setTimeout(poll, 2000);
      } else {
        // Gave up waiting; do a final reload to show whatever landed.
        setProposing(false);
        reload();
      }
    };
    setTimeout(poll, 2000);
    pollCancelRef.current = () => { cancelled = true; };
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
          <span className="badge badge-review">{t.documentDetail.hrRulingBadge}</span>
        )}
        {doc.ocr_pages_count > 0 && (
          <span className="badge badge-ocr">
            <span aria-hidden="true">⚙</span> {t.documentDetail.ocrdBadge} ({doc.ocr_pages_count})
          </span>
        )}
        <button className="btn btn-ghost" onClick={onClose} aria-label={t.documentDetail.close}>✕</button>
      </div>
      <div className="detail-body">

      {doc.ruling && (
        <p className="notice notice--neutral">
          <span aria-hidden="true">🔁</span>
          {t.documentDetail.createdFromEscalation} <strong>#{doc.ruling.escalation_id}</strong>
          {doc.ruling.agent ? ` ${t.documentDetail.byAgent} ${doc.ruling.agent}` : ''}.
          {doc.ruling.escalation_uuid && onOpenEscalation && (
            <>
              {' '}
              <button className="btn btn-ghost btn-inline" onClick={() => onOpenEscalation(doc.ruling!.escalation_uuid!)}>
                {t.documentDetail.viewCard}
              </button>
            </>
          )}
        </p>
      )}

      {!canEdit && (
        <p className="notice notice--neutral">
          <span aria-hidden="true">🔒</span>
          {t.documentDetail.readOnlyPrefix} <code>knowledge.edit</code> {t.documentDetail.readOnlySuffix}
        </p>
      )}

      {doc.is_unscoped && (
        <p className="notice">
          <span aria-hidden="true">⚠</span>
          {t.documentDetail.noConvenioNotice}
        </p>
      )}

      {doc.empty_text && (
        <p className="notice">
          <span aria-hidden="true">∅</span>
          {t.documentDetail.noTextOcrPrefix}{' '}
          <code>documents:ocr-backfill</code> {t.documentDetail.noTextOcrMiddle}{' '}
          <code>--ocr</code>.
        </p>
      )}

      {suspectedMistag && (
        <p className="notice">
          <span aria-hidden="true">●</span>
          {t.documentDetail.suspectedMistagPrefix}{' '}
          {canEdit ? t.documentDetail.suspectedMistagEditHint : t.documentDetail.suspectedMistagNoEditHint}
        </p>
      )}

      {doc.is_ai_proposed && (
        <p className="notice notice--ai">
          <span className="ai-pill">AI</span>
          {'  '}{t.documentDetail.aiTaggingUnverified} <strong>{t.documentDetail.aiTaggingInert}</strong> {t.documentDetail.aiTaggingUntilConfirm}{' '}
          <strong>{t.documentDetail.aiTaggingStep1Label}</strong> {t.documentDetail.aiTaggingStep1Text}{' '}
          <strong>{t.documentDetail.aiTaggingStep2Label}</strong> {t.documentDetail.aiTaggingStep2Click} <strong>{t.documentDetail.confirmTagsButton}</strong> {t.documentDetail.aiTaggingStep2Suffix}
        </p>
      )}

      <AiSuggestionsSection doc={doc} canEdit={canEdit} />

      <section>
        <h4>{t.documentDetail.scopeHeading}</h4>
        <div className="facets">
          <Facet label={t.common.convenio} value={doc.tags.convenio ? `${doc.tags.convenio.numero} — ${doc.tags.convenio.name}` : t.common.dash} />
          <Facet label={t.common.territory} value={doc.tags.territory ? `${doc.tags.territory.name} (${doc.tags.territory.level})` : t.common.dash} derived />
          <Facet label={t.common.sector} value={doc.tags.sector?.name ?? t.common.dash} derived />
          <Facet label={t.common.type} value={doc.tags.document_type?.name ?? t.common.dash} />
          <Facet label={t.common.validity} value={doc.validity_start ? `${doc.validity_start} → ${doc.validity_end ?? t.common.dash}` : t.common.dash} />
        </div>
        <dl className="kv">
          {/* Sprint 11a (§D.2) — a genuine detail view (spec's own carve-out),
              but had no label at all, raw key only. Label + raw key kept
              alongside, satisfying both the list/detail distinction and the
              engineer's need for the exact key. */}
          <dt>{t.documentDetail.kvRetrieval}</dt><dd>{retrievalStatusLabel(t, doc.retrieval_status)} ({doc.retrieval_status})</dd>
          <dt>{t.documentDetail.kvAuthority}</dt><dd>{doc.authority_level}</dd>
          <dt>{t.documentDetail.kvLanguage}</dt><dd>{doc.language}</dd>
          <dt>{t.documentDetail.kvStatus}</dt><dd>{taggingStatusLabel(t, doc.tagging_status)} ({doc.tagging_status}) · {t.common.confianza} {doc.tagging_confidence ?? t.common.dash}</dd>
        </dl>
      </section>

      <TopicsSection doc={doc} canEdit={canEdit} onChanged={reload} />

      <ChunkHealthSection health={doc.chunk_health} />

      <LineageSection lineage={doc.lineage} />

      {doc.review_tasks.length > 0 && (
        <section>
          <h4>{t.documentDetail.reviewTasksHeading}</h4>
          {doc.review_tasks.map((task, i) => (
            <div key={i} className={`review-task ${task.reason === 'conflict' ? 'is-conflict' : 'is-unresolved'}`}>
              <strong>{task.reason ?? task.type}</strong> · {task.status}
              {task.raw_unmatched_values && task.raw_unmatched_values.length > 0 && (
                <ul>
                  {task.raw_unmatched_values.map((rv, j) => (
                    <UnmatchedValueRow
                      key={j}
                      facet={rv.facet}
                      value={rv.value}
                      canEdit={canEdit}
                      sourceDocumentUuid={doc.uuid}
                      onChanged={reload}
                    />
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
            disabled={busy || proposing || doc.tagging_status === 'verified'}
          >
            {doc.tagging_status === 'verified' ? t.documentDetail.tagsConfirmed : t.documentDetail.confirmTagsButton}
          </button>
          {doc.tagging_status === 'under_review' && (
            <>
              <button
                className="btn btn-ghost"
                onClick={resuggest}
                disabled={busy || proposing}
                title={doc.empty_text ? t.documentDetail.resuggestTitleNoText : t.documentDetail.resuggestTitleReady}
              >
                {proposing ? t.documentDetail.proposing : t.documentDetail.resuggestButton}
              </button>
              {suggestNotice && (
                <p className="notice notice--neutral" style={{ marginTop: '0.5rem' }}>
                  {suggestNotice}
                </p>
              )}
            </>
          )}
        </section>
      )}

      <section>
        <h4>{t.documentDetail.provenanceHeading}</h4>
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
                  ) : e.old_value ? <span className="timeline-value"> ({t.documentDetail.removedLabel})</span> : null}
                </span>
                {e.note ? <div className="timeline-meta">{e.note}</div> : null}
                <div className="timeline-meta">{e.created_at}{e.actor_id ? ` · ${t.documentDetail.adminHashPrefix}${e.actor_id}` : ''}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <SourceViewer uuid={uuid} />

      <SandboxPanel uuid={uuid} title={doc.title} />

      {doc.pages.length > 0 && (
        <section>
          <h4>{t.documentDetail.sourcePagesHeading} ({doc.pages.length})</h4>
          <PaginatedPageViewer uuid={uuid} pages={doc.pages} />
        </section>
      )}
      </div>
    </aside>
    </div>
  );
}

function Facet({ label, value, derived }: { label: string; value: string; derived?: boolean }) {
  const t = useT();
  return (
    <span className="facet">
      <span className="facet-label">
        {label}
        {derived && <span className="facet-derived" title={t.documentDetail.derivedTitleHint}> ({t.documentDetail.derivedLabel})</span>}
      </span>
      <span className="facet-value">{value}</span>
    </span>
  );
}

// -----------------------------------------------------------------------------
// AI suggestions (Sprint 7a) — the unverified ai_agent facet proposals, fuchsia.
// Derived from the provenance timeline; shown live ONLY while under_review. On
// verify the doc reverts to normal styling and these live in history only.
// -----------------------------------------------------------------------------

function AiSuggestionsSection({ doc, canEdit }: { doc: DocumentDetail; canEdit: boolean }) {
  const t = useT();
  const facetLabels: Record<string, string> = {
    convenio: t.common.convenio,
    territory: t.common.territory,
    sector: t.common.sector,
    document_type: t.common.type,
    validity: t.common.validity,
    topic: t.common.topic,
  };
  if (!doc.is_ai_proposed) return null;

  // The latest ai_agent suggestion per facet (the proposals to review).
  const aiEvents = doc.provenance.filter((e: ProvenanceEvent) => e.source === 'ai_agent' && e.new_value);
  const latestByFacet = new Map<string, ProvenanceEvent>();
  for (const e of aiEvents) latestByFacet.set(e.facet, e);
  const suggestions = Array.from(latestByFacet.values());

  // Unresolved values the AI flagged (it never invents vocabulary).
  const aiUnresolved = doc.provenance.filter((e: ProvenanceEvent) => e.source === 'ai_agent' && !e.new_value && /unresolved/i.test(e.note ?? ''));

  if (suggestions.length === 0 && aiUnresolved.length === 0) return null;

  return (
    <section className="ai-suggestions ai-marked">
      <h4><span className="ai-pill">AI</span> {t.documentDetail.aiSuggestedHeading} <span className="muted">{t.documentDetail.aiSuggestedUnverified}</span></h4>
      {suggestions.length > 0 ? (
        <div className="facets">
          {suggestions.map((e, i) => (
            <span key={i} className="facet">
              <span className="facet-label">{facetLabels[e.facet] ?? e.facet}</span>
              <span className="facet-value ai-facet">
                {e.new_value}
                {e.confidence != null && <span className="muted"> · {Math.round(e.confidence * 100)}%</span>}
              </span>
            </span>
          ))}
        </div>
      ) : (
        <p className="muted">{t.documentDetail.aiUnresolvedNotice}</p>
      )}
      <p className="timeline-meta">
        {t.documentDetail.aiSuggestionsNotChanged}{' '}
        {canEdit ? t.documentDetail.aiSuggestionsEditHint : t.documentDetail.aiSuggestionsNoEditHint}
      </p>
      {aiUnresolved.length > 0 && (
        <ul className="ai-unresolved">
          {aiUnresolved.map((e, i) => (
            <li key={i} className="timeline-meta">{e.note}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

// One raw_unmatched_value with an inline "propose vocabulary" affordance.
function UnmatchedValueRow({
  facet,
  value,
  canEdit,
  sourceDocumentUuid,
  onChanged,
}: {
  facet: string;
  value: string;
  canEdit: boolean;
  sourceDocumentUuid: string;
  onChanged: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const proposable = facet === 'territory' || facet === 'sector' || facet === 'convenio';

  return (
    <li>
      <code>{facet}</code>: {value}
      {canEdit && proposable && !msg && (
        <button className="btn btn-ghost btn-inline" onClick={() => setOpen((o) => !o)}>
          {open ? t.documentDetail.cancelPropose : t.documentDetail.proposeVocabulary}
        </button>
      )}
      {msg && <span className="muted"> — {msg}</span>}
      {open && !msg && (
        <ProposeVocabularyForm
          facet={facet as VocabularyFacet}
          value={value}
          sourceDocumentUuid={sourceDocumentUuid}
          onDone={(m) => {
            setMsg(m);
            setOpen(false);
            onChanged();
          }}
        />
      )}
    </li>
  );
}

// -----------------------------------------------------------------------------
// Topics — current tags + provenance source; add/remove for editors
// -----------------------------------------------------------------------------

function TopicsSection({ doc, canEdit, onChanged }: { doc: DocumentDetail; canEdit: boolean; onChanged: () => void }) {
  const t = useT();
  const [options, setOptions] = useState<VocabularyItem[]>([]);
  const [add, setAdd] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (canEdit) getVocabulary('topics').then((r) => setOptions(r.items)).catch(() => setOptions([]));
  }, [canEdit]);

  const applied = new Set(doc.topics.map((topic) => topic.id));
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
      <h4>{t.documentDetail.topicsHeading}</h4>
      {doc.topics.length === 0 ? (
        <p className="muted">{t.documentDetail.noTopicsNotice}</p>
      ) : (
        <div className="facets">
          {doc.topics.map((topic) => (
            <span key={topic.id} className="chip">
              <span className={`timeline-dot src-${topic.source}`} aria-hidden="true" /> {topic.name}
              {canEdit && (
                <button className="chip-x" onClick={() => onRemove(topic.id)} disabled={busy} aria-label={`${t.documentDetail.removeTopicAriaPrefix} ${topic.name}`}>
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
            <option value="">{t.documentDetail.addTopicPlaceholder}</option>
            {pickable.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={onAdd} disabled={busy || !add}>{t.documentDetail.addTopicButton}</button>
        </div>
      )}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Chunk health (resolved Q5: no es/eu split)
// -----------------------------------------------------------------------------

function ChunkHealthSection({ health }: { health: ChunkHealth }) {
  const t = useT();
  const { locale } = useLocale();
  const tokenLocale = locale === 'en' ? 'en-US' : 'es-ES';
  return (
    <section>
      <h4>{t.documentDetail.chunkHealthHeading}</h4>
      {health.zero_chunks ? (
        <p className="notice">
          <span aria-hidden="true">∅</span>
          {t.documentDetail.zeroChunksNotice}
        </p>
      ) : (
        <dl className="kv">
          <dt>{t.documentDetail.chunksLabel}</dt><dd>{health.chunk_count}</dd>
          <dt>{t.documentDetail.tokensLabel}</dt><dd>{new Intl.NumberFormat(tokenLocale).format(health.token_total)}</dd>
          <dt>{t.documentDetail.pagesLabel}</dt><dd>{health.first_page ?? t.common.dash}–{health.last_page ?? t.common.dash}</dd>
          <dt>{t.documentDetail.embeddingsLabel}</dt><dd>{health.has_embeddings ? t.documentDetail.embeddingsPresent : t.documentDetail.embeddingsMissing}</dd>
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
  const t = useT();
  return (
    <div className="lineage-row">
      <span className="lineage-rel">{rel}</span>
      <span className="lineage-title">{item.title}</span>
      <span className={`badge badge-${item.retrieval_status === 'active' ? 'verified' : 'historical'}`}>{retrievalStatusLabel(t, item.retrieval_status)}</span>
      <span className="timeline-meta">{item.validity_start ?? t.common.dash} → {item.validity_end ?? t.common.dash}</span>
    </div>
  );
}

function LineageSection({ lineage }: { lineage: { predecessor: LineageRef | null; successors: LineageRef[] } }) {
  const t = useT();
  if (!lineage.predecessor && lineage.successors.length === 0) return null;
  return (
    <section>
      <h4>{t.documentDetail.lineageHeading}</h4>
      {lineage.predecessor && <LineageRow item={lineage.predecessor} rel={t.documentDetail.lineageSupersedes} />}
      {lineage.successors.map((s) => <LineageRow key={s.uuid} item={s} rel={t.documentDetail.lineageSupersededBy} />)}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Bounded edit — FK pickers + scope-warning modal (knowledge.edit only)
// -----------------------------------------------------------------------------

function EditControls({ doc, suspectedMistag, onChanged }: { doc: DocumentDetail; suspectedMistag: boolean; onChanged: () => void }) {
  const t = useT();
  return (
    <section className="edit-block">
      <h4>{t.documentDetail.editLabelsHeading}</h4>
      <p className="timeline-meta">{t.documentDetail.editLabelsNotice}</p>
      <ReassignControls doc={doc} suspectedMistag={suspectedMistag} onChanged={onChanged} />
      <LifecycleControls doc={doc} onChanged={onChanged} />
    </section>
  );
}

function ReassignControls({ doc, suspectedMistag, onChanged }: { doc: DocumentDetail; suspectedMistag: boolean; onChanged: () => void }) {
  const t = useT();
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
        title: facet === 'convenio' ? t.documentDetail.rescopeConfirmTitle : t.documentDetail.retypeConfirmTitle,
        body: facet === 'convenio' ? t.documentDetail.rescopeConfirmBody : t.documentDetail.retypeConfirmBody,
      });
    } else {
      doApply();
    }
  };

  return (
    <>
      <div className="reassign">
        <select className="select" value={facet} onChange={(e) => onFacetChange(e.target.value as 'convenio' | 'document_type')}>
          <option value="convenio">{t.documentDetail.rescopeConvenio}</option>
          <option value="document_type">{t.documentDetail.retypeDocument}</option>
        </select>
        <select className="select" value={valueId} onChange={(e) => setValueId(e.target.value)}>
          <option value="">{t.documentDetail.selectValuePlaceholder}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {facet === 'convenio' ? `${o.numero} — ${o.name}` : o.name}
            </option>
          ))}
        </select>
        <button className={`btn ${needsConfirm ? 'btn-warning' : 'btn-secondary'}`} onClick={onApplyClick} disabled={busy || !valueId}>
          {facet === 'document_type' && suspectedMistag ? t.documentDetail.retagButton : t.documentDetail.applyButton}
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
  const t = useT();
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
        <label>{t.documentDetail.retrievalFieldLabel}
          {/* Sprint 11b: raw enum values (draft/active/historical/...) shown
              verbatim as their own option text — technical status codes, not
              chrome, invariant across locale (guard test's
              ALLOWED_HARDCODED_STRINGS, same treatment as a CLI command name). */}
          <select className="select" value={retrieval} onChange={(e) => setRetrieval(e.target.value)}>
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="historical">historical</option>
          </select>
        </label>
        <label>{t.documentDetail.taggingFieldLabel}
          <select className="select" value={tagging} onChange={(e) => setTagging(e.target.value)}>
            <option value="auto_proposed">auto_proposed</option>
            <option value="under_review">under_review</option>
            <option value="verified">verified</option>
          </select>
        </label>
        <label>{t.documentDetail.validFromLabel}
          <input className="input" type="date" value={vStart} onChange={(e) => setVStart(e.target.value)} />
        </label>
        <label>{t.documentDetail.validToLabel}
          <input className="input" type="date" value={vEnd} onChange={(e) => setVEnd(e.target.value)} />
        </label>
      </div>
      <button className={`btn ${scopeAffecting ? 'btn-warning' : 'btn-secondary'}`} onClick={onSaveClick} disabled={busy || !dirty}>
        {t.documentDetail.saveLifecycle}{scopeAffecting ? ` ${t.documentDetail.scopeAffectingSuffix}` : ''}
      </button>
      {pending && (
        <ScopeWarningModal
          title={t.documentDetail.scopeAffectingModalTitle}
          body={t.documentDetail.scopeAffectingModalBody}
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
  const t = useT();
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <h4 className="modal-title"><span aria-hidden="true">⚠</span> {title}</h4>
        <p className="modal-body">{body}</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>{t.common.cancel}</button>
          <button className="btn btn-warning" onClick={onConfirm} disabled={busy}>{t.documentDetail.confirmChangeButton}</button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Real-document viewer (presigned S3 source)
// -----------------------------------------------------------------------------

function SourceViewer({ uuid }: { uuid: string }) {
  const t = useT();
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
      <h4>{t.documentDetail.originalDocumentHeading}</h4>
      <button className="btn btn-secondary" onClick={onToggle}>{open ? t.documentDetail.hideSource : t.documentDetail.viewOriginal}</button>
      {open && err && <p className="error">{err}</p>}
      {open && url && (
        type === 'application/pdf' ? (
          <object data={url} type="application/pdf" className="source-frame" aria-label={t.documentDetail.originalDocumentHeading}>
            <p className="muted">{t.documentDetail.cantEmbedPrefix} <a href={url} target="_blank" rel="noreferrer">{t.documentDetail.openTheFile}</a>.</p>
          </object>
        ) : (
          <p className="muted"><a href={url} target="_blank" rel="noreferrer">{t.documentDetail.downloadOrOpen}</a></p>
        )
      )}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Read-only sandbox — test a question against THIS document (persists nothing)
// -----------------------------------------------------------------------------

function SandboxPanel({ uuid, title }: { uuid: string; title: string }) {
  const t = useT();
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
      <h4>{t.documentDetail.sandboxHeading} <span className="sandbox-tag">{t.documentDetail.sandboxTag}</span></h4>
      <p className="timeline-meta">{t.documentDetail.sandboxRunPrefix} “{title}” {t.documentDetail.sandboxRunSuffix}</p>
      <div className="reassign">
        <input
          className="input"
          placeholder={t.documentDetail.sandboxPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
        />
        <button className="btn btn-primary" onClick={run} disabled={busy || !q.trim()}>{busy ? t.documentDetail.running : t.documentDetail.testButton}</button>
      </div>
      {err && <p className="error">{err}</p>}
      {res && (
        <div className={`sandbox-result ${outcome === 'answer' ? 'is-answer' : 'is-escalate'}`}>
          <div className="sandbox-outcome">
            <span className={`badge ${outcome === 'answer' ? 'badge-verified' : 'badge-review'}`}>{outcome === 'answer' ? t.documentDetail.outcomeAnswered : outcome ? t.documentDetail.outcomeEscalated : t.documentDetail.outcomeResult}</span>
            {res.trace.retrieval && <span className="timeline-meta"> {t.documentDetail.retrievedPrefix} {res.trace.retrieval.returned} · {t.documentDetail.topScorePrefix} {res.trace.retrieval.top_score?.toFixed?.(3)}</span>}
          </div>
          <p className="sandbox-answer">{res.answer}</p>
          {res.citations.length > 0 && (
            <ul className="sandbox-cites">
              {res.citations.map((c, i) => (
                <li key={i}>[{i + 1}] {t.documentDetail.pageAbbr}{c.page_from ?? t.common.dash}{c.page_to && c.page_to !== c.page_from ? `–${c.page_to}` : ''}: {c.snippet}</li>
              ))}
            </ul>
          )}
          {outcome !== 'answer' && draft && (
            <details className="sandbox-draft">
              <summary>{t.documentDetail.draftSummary}</summary>
              <p>{draft}</p>
              {grounding?.ungrounded && grounding.ungrounded.length > 0 && (
                <p className="timeline-meta">{t.documentDetail.groundingStoppedPrefix} {grounding.ungrounded.join('; ')}</p>
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
  pages: {
    page_number: number;
    text: string;
    has_text: boolean;
    extraction_source?: string;
    ocr_quality?: number | null;
    ocr_bilingual?: boolean;
  }[];
}) {
  const t = useT();
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
        <button className="btn btn-secondary" onClick={() => go(idx - 1)} disabled={idx === 0}>{t.documentDetail.pagerPrev}</button>
        <span className="page-counter">{t.documentDetail.pageCounter} {page.page_number} {t.documentDetail.pageCounterOf} {total}</span>
        <button className="btn btn-secondary" onClick={() => go(idx + 1)} disabled={idx === total - 1}>{t.documentDetail.pagerNext}</button>
      </div>
      {page.extraction_source === 'ocr' && (
        <p className="notice notice--neutral">
          <span aria-hidden="true">⚙</span> {t.documentDetail.ocrExtractedText}
          {page.ocr_quality != null ? ` · ${t.documentDetail.ocrQualityPrefix} ${Math.round(page.ocr_quality * 100)}%` : ''}.
          {page.ocr_bilingual && ` ${t.documentDetail.ocrBilingualNotice}`}
        </p>
      )}
      <div className="page-viewer-content">
        <div className="page-viewer-img">
          {imgLoading && <p className="muted">{t.documentDetail.loadingImage}</p>}
          {!imgLoading && imgUrl && <img src={imgUrl} alt={`${t.documentDetail.pageAlt} ${page.page_number}`} />}
          {!imgLoading && !imgUrl && <p className="muted">{t.documentDetail.noImage}</p>}
        </div>
        <div className="page-viewer-text">
          <pre className="well">{page.text || t.documentDetail.noExtractableText}</pre>
        </div>
      </div>
    </div>
  );
}
