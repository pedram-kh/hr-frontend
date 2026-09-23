import { useEffect, useState } from 'react';
import {
  getExpiryQueue,
  getVocabulary,
  listDocuments,
  listReferenceFacts,
  listVocabularyProposals,
  proposeSuccession,
  rejectSuccessionProposal,
  rejectVocabularyProposal,
  resolveExpiryTask,
  type DocumentRow,
  type ExpiryTask,
  type ReferenceFactRow,
  type VocabularyFacet,
  type VocabularyItem,
  type VocabularyProposal,
} from '../../lib/api';
import { usePaginatedQuery } from '../../lib/usePaginatedQuery';
import { Pager } from './Pager';
import { DocumentDetailPanel } from './DocumentDetailPanel';
import { GroupsQueue } from './GroupsQueue';
import { FactDuplicatePanel } from './FactDuplicatePanel';
import { ReferenceFactPanel } from './ReferenceFactPanel';
import { ApproveProposalControls } from './ProposeVocabularyForm';
import { firstLine } from '../../lib/format';
import { FilterToolbar } from '../../components/FilterToolbar';
import { useT, useLocale } from '../../i18n/context';
import { formatPercent } from '../../i18n/format';

// Sprint 8 follow-up (found live, eyes-on 2026-09-10): 'quality' used to be a
// tab nested here. Promoted to its own top-level AdminShell view (`Calidad`,
// alongside its Analítica/Cobertura siblings — `data-model.md`'s own access
// table already described it as a peer nav entry, not a Review sub-tab) so
// it isn't hidden inside a page most roles have no other reason to open.
// See `QualitySampleQueue` (now rendered directly by `AdminShell`) and
// `canViewQuality` in `lib/api.ts`.
type Tab = 'tagging' | 'reference-facts' | 'groups' | 'vocabulary' | 'expiry';

const VALID_TABS: readonly Tab[] = ['tagging', 'reference-facts', 'groups', 'vocabulary', 'expiry'];

function isTab(v: string | null): v is Tab {
  return v !== null && (VALID_TABS as readonly string[]).includes(v);
}

// Sprint 7a/7b-2 — the messy-tail review surfaces, in one place: the AI tagging
// backlog (verify reuses the Sprint-3 Confirm UI), the AI-segmented reference
// facts (uncertain-first — the 7b-2 safety queue), the proposed-vocabulary list
// (approve = vocabulary.approve), and the expiry queue (human-confirmed
// succession). Fuchsia marks unverified-AI ONLY.
//
// Sprint 7g Item 2 — `initialTab`/`initialFactUuid`/`initialConvenioId` are the
// one-shot deep-link props AdminShell reads out of `#view=review&tab=...`
// (ADR-0029's fix_link scheme). They only ever set the INITIAL selection
// (lazy useState initializers below, same posture as the pre-existing
// `#doc=` pattern) — never a live subscription to hash changes.
export function ReviewQueuePage({
  initialTab = null,
  initialFactUuid = null,
  initialConvenioId = null,
}: {
  initialTab?: string | null;
  initialFactUuid?: string | null;
  initialConvenioId?: number | null;
}) {
  const [tab, setTab] = useState<Tab>(() => (isTab(initialTab) ? initialTab : 'tagging'));
  const t = useT();
  return (
    <div className="review-queue">
      <div className="tabs">
        <button className={`tab ${tab === 'tagging' ? 'active' : ''}`} onClick={() => setTab('tagging')}>{t.reviewQueue.tabTagging}</button>
        <button className={`tab ${tab === 'reference-facts' ? 'active' : ''}`} onClick={() => setTab('reference-facts')}>{t.reviewQueue.tabReferenceFacts}</button>
        <button className={`tab ${tab === 'groups' ? 'active' : ''}`} onClick={() => setTab('groups')}>{t.reviewQueue.tabGroups}</button>
        <button className={`tab ${tab === 'vocabulary' ? 'active' : ''}`} onClick={() => setTab('vocabulary')}>{t.reviewQueue.tabVocabulary}</button>
        <button className={`tab ${tab === 'expiry' ? 'active' : ''}`} onClick={() => setTab('expiry')}>{t.reviewQueue.tabExpiry}</button>
      </div>
      {tab === 'tagging' && <TaggingQueue />}
      {tab === 'reference-facts' && <ReferenceFactsQueue initialFactUuid={initialFactUuid} />}
      {tab === 'groups' && <GroupsQueue initialConvenioId={initialConvenioId} />}
      {tab === 'vocabulary' && <VocabularyQueue />}
      {tab === 'expiry' && <ExpiryQueue />}
    </div>
  );
}

// --- Reference facts awaiting verification (Sprint 7b-2 + manual, 7b-1) ------
// The riskiest queue: most rows are an AI scope-assignment, but a manual
// create (7b-1's own path) lands `needs_review` exactly the same way and
// belongs here too — Correction queue-source-01 (found live: fact #169 had
// no UI path to verify it at all, because this queue's own filter required
// `source = 'ai_agent'`). UNCERTAIN-FIRST so a flagged fact (scope unclear /
// compound group / possible version — AI-only signals) floats to the top,
// then the least-confident, then (Sprint 10c, D7) real employee demand for
// that fact's topic — safety outranks demand, so demand only ever breaks ties
// within the same uncertainty/confidence tier; presentation-only, changes
// nothing about which facts are IN the queue. A manual fact has neither
// uncertainty nor confidence, so it simply falls to the bottom of its tier,
// same rules, not a special case. Open one to check the source (the quoted
// line for AI, the linked document for manual) against the assigned scope,
// then verify / fix-then-verify / reject. Inert until verified (not
// answerable until a human verifies it; once verified, it can be served
// directly as a live answer — 7c).
function ReferenceFactsQueue({ initialFactUuid = null }: { initialFactUuid?: string | null }) {
  const t = useT();
  const { locale } = useLocale();
  // Sprint 7g Item 2 — a `#fact=<uuid>` deep link opens straight to that
  // fact's detail panel (below), whether or not it happens to be in the
  // CURRENT queue filter — `ReferenceFactPanel` fetches its own detail by
  // uuid, independent of the list.
  const [selected, setSelected] = useState<string | null>(initialFactUuid);
  // Sprint 7d — the version pair opens its own side-by-side surface, because the
  // question ("which of these two is true, and since when?") is about the PAIR,
  // not about either fact alone.
  const [pairUuid, setPairUuid] = useState<string | null>(null);
  // Sprint 10c, D7 — the source document a fact's "Ver documento" button
  // opens. Previously wired to nothing (`ReferenceFactPanel`'s
  // `onOpenDocument` prop was simply never passed here, so the button was a
  // silent no-op — found live, eyes-on 2026-09-13). Mirrors CoveragePage's/
  // KnowledgeMapPage's identical leaf-opens-card wiring: opening the
  // document closes the fact panel, same surface either way.
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  // Sprint 10c, D7 — the topic filter, wired to the SAME `topic_id` param
  // `ReferenceFactController::index` already accepted (no backend change
  // needed for the filter itself — only for the new demand-tier ordering).
  const [topicFilter, setTopicFilter] = useState<string>('');
  const [topics, setTopics] = useState<VocabularyItem[]>([]);

  useEffect(() => {
    getVocabulary('topics').then((r) => setTopics(r.items)).catch(() => setTopics([]));
  }, []);

  // Sprint 7g Item 2 — pagination + visible total (the Documents-page fix
  // applied here): `ReferenceFactController::index` already paginates at 50
  // server-side (unchanged); this tab previously only ever read page 1
  // (`p.facts.data`) and silently dropped everything past the cap. Sprint 8:
  // extracted into `usePaginatedQuery`. `topicFilter` in `depsKey` refetches
  // from page 1 when the filter changes (Sprint 10c, D7).
  const { rows, loading, error, meta, setPage, refresh } = usePaginatedQuery<ReferenceFactRow>(
    (page) => listReferenceFacts({
      queue: 'true',
      page: String(page),
      ...(topicFilter ? { topic_id: topicFilter } : {}),
    }).then((p) => p.facts),
    topicFilter,
  );

  return (
    <>
      <p className="muted">
        {t.reviewQueue.facts.intro} <strong>{t.reviewQueue.facts.introUncertainFirst}</strong>{t.reviewQueue.facts.introRest}
      </p>
      <FilterToolbar
        filters={{ topicFilter }}
        onClear={() => setTopicFilter('')}
        total={<span className="muted docs-total">{meta.total} {meta.total === 1 ? t.reviewQueue.facts.totalOne : t.reviewQueue.facts.totalMany}</span>}
      >
        <select className="select" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
          <option value="">{t.reviewQueue.facts.allTopics}</option>
          {topics.map((tp) => (<option key={tp.id} value={tp.id}>{tp.name}</option>))}
        </select>
      </FilterToolbar>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">{t.common.loading}</p>
      ) : (
        <table className="docs-table">
          <thead>
            {/* Sprint 7g Item 2 — id + source line inline, so a reviewer can
                identify and sanity-check a fact from the list itself.
                Sprint 10c, D7 — the Topic column, so the new filter above has
                something to visually confirm against. */}
            <tr><th className="num">{t.reviewQueue.facts.colId}</th><th>{t.reviewQueue.facts.colValue}</th><th>{t.reviewQueue.facts.colSource}</th><th>{t.reviewQueue.facts.colScope}</th><th>{t.reviewQueue.facts.colGroup}</th><th>{t.reviewQueue.facts.colTopic}</th><th className="num">{t.reviewQueue.facts.colConf}</th><th>{t.reviewQueue.facts.colFlags}</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.uuid}
                className={`${selected === r.uuid ? 'is-selected' : ''} ${r.is_ai_proposed ? 'ai-marked' : ''}`}
                onClick={() => setSelected(r.uuid)}
              >
                <td className="num muted">#{r.id}</td>
                <td className="cell-clip">{r.value}</td>
                <td className="cell-clip muted small" title={r.source_excerpt ?? undefined}>
                  {firstLine(r.source_excerpt) ?? '—'}
                </td>
                <td>{[r.territory, r.sector].filter(Boolean).join(' · ') || r.convenio || '—'}</td>
                <td>{r.group_label ?? r.job_category ?? '—'}</td>
                <td className="cell-clip">{r.topic ?? '—'}</td>
                <td className="num">{r.confidence != null ? formatPercent(r.confidence * 100, locale) : '—'}</td>
                <td className="flags">
                  {/* Correction queue-source-01 — the source badge, always one or
                      the other: fuchsia "AI" (unchanged, unverified-AI only,
                      ADR-0020) vs neutral "Manual". */}
                  {r.is_ai_proposed && <span className="ai-pill">AI</span>}
                  {r.is_manual_pending && <span className="badge badge-manual">{t.reviewQueue.facts.manualBadge}</span>}
                  {r.uncertainty && <span className="badge badge-conflict">⚠ {r.uncertainty.field}</span>}
                  {r.is_unresolved_duplicate && <span className="badge badge-conflict">≈ {t.reviewQueue.facts.versionBadge}</span>}
                  {r.resolution && <span className="badge badge-historical">{r.resolution}</span>}
                </td>
                <td>
                  {/* Sprint 7d — the 7b-2 flag is now actionable. Only an UNRESOLVED
                      one offers the action; a resolved pair keeps its lineage badge. */}
                  {r.is_unresolved_duplicate && (
                    <button
                      className="btn btn-ghost"
                      onClick={(e) => { e.stopPropagation(); setPairUuid(r.uuid); }}
                    >
                      {t.reviewQueue.facts.resolveVersion}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="col-empty">{t.reviewQueue.facts.noFacts}</td></tr>
            )}
          </tbody>
        </table>
      )}
      <Pager meta={meta} setPage={setPage} />
      {selected && (
        <ReferenceFactPanel
          uuid={selected}
          onClose={() => setSelected(null)}
          onChanged={refresh}
          onResolveDuplicate={setPairUuid}
          onOpenDocument={(uuid) => { setSelected(null); setSelectedDoc(uuid); }}
        />
      )}
      {pairUuid && (
        <FactDuplicatePanel uuid={pairUuid} onClose={() => setPairUuid(null)} onChanged={refresh} />
      )}
      {selectedDoc && (
        <DocumentDetailPanel uuid={selectedDoc} onClose={() => setSelectedDoc(null)} onChanged={refresh} />
      )}
    </>
  );
}

// --- AI tagging backlog -------------------------------------------------------
// Sprint 7g Item 2 — pagination + visible total (the Documents-page fix
// applied here): `DocumentController::index` already paginates at 50
// server-side (unchanged); this tab previously only ever read page 1
// (`p.data`) and silently dropped everything past the cap, same gap the
// Documents page itself had before Sprint 7e. `meta` carries Laravel's
// standard envelope so the total is always visible and a cap can't be silent.
function TaggingQueue() {
  const t = useT();
  const { locale } = useLocale();
  const [selected, setSelected] = useState<string | null>(null);
  const { rows, loading, error, meta, setPage, refresh } = usePaginatedQuery<DocumentRow>(
    (page) => listDocuments({ tagging_status: 'under_review', sort: 'confidence', page: String(page) }),
  );

  return (
    <>
      <p className="muted">
        {t.reviewQueue.tagging.introPrefix} <code>{t.reviewQueue.tagging.underReview}</code> {t.reviewQueue.tagging.introSuffix}
      </p>
      {/* Sprint 11a (§C.2) — chrome-only wrap: this tab has no filter controls
          (§C.1), so FilterToolbar renders no "Filtros" button at all — only
          the always-visible total, same chrome position as every other
          filtered/filterless admin screen. */}
      <FilterToolbar total={<span className="muted docs-total">{meta.total} {meta.total === 1 ? t.reviewQueue.tagging.totalOne : t.reviewQueue.tagging.totalMany}</span>} />
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">{t.common.loading}</p>
      ) : (
        <table className="docs-table">
          <thead>
            <tr><th>{t.reviewQueue.tagging.colTitle}</th><th>{t.reviewQueue.tagging.colConvenio}</th><th>{t.reviewQueue.tagging.colType}</th><th className="num">{t.reviewQueue.tagging.colConfidence}</th><th>{t.reviewQueue.tagging.colFlags}</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.uuid}
                className={`${selected === r.uuid ? 'is-selected' : ''} ${r.is_ai_proposed ? 'ai-marked' : ''}`}
                onClick={() => setSelected(r.uuid)}
              >
                <td>{r.title}</td>
                <td>{r.convenio ?? t.common.dash}</td>
                <td>{r.document_type ?? t.common.dash}</td>
                <td className="num">{r.tagging_confidence != null ? formatPercent(r.tagging_confidence * 100, locale) : t.common.dash}</td>
                <td className="flags">
                  {r.is_ai_proposed && <span className="ai-pill">AI</span>}
                  {r.has_open_conflict && <span className="badge badge-conflict">⚠ {t.reviewQueue.tagging.conflictBadge}</span>}
                  {r.empty_text && <span className="badge badge-empty">∅ {t.reviewQueue.tagging.noTextBadge}</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="col-empty">{t.reviewQueue.tagging.nothingUnderReview}</td></tr>
            )}
          </tbody>
        </table>
      )}
      {/* Always rendered (not hidden on a single page) — "page 1 of 1" is
          itself visible proof there's nothing hidden past the cap. */}
      <Pager meta={meta} setPage={setPage} />
      {selected && <DocumentDetailPanel uuid={selected} onClose={() => setSelected(null)} onChanged={() => refresh()} />}
    </>
  );
}

// --- Vocabulary proposals -----------------------------------------------------
// Sprint 7g Item 2 — pagination + visible total (the Documents-page fix
// applied here): `VocabularyProposalController::index` now paginates at 50
// server-side (additive backend change this sprint, same envelope as
// Reference-facts/Documents).
function VocabularyQueue() {
  const t = useT();
  const { locale } = useLocale();
  const [canApprove, setCanApprove] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    rows: proposals,
    loading,
    error,
    meta,
    setPage,
    refresh,
  } = usePaginatedQuery<VocabularyProposal>((page) =>
    listVocabularyProposals('proposed', page).then((r) => {
      setCanApprove(r.can_approve);
      return r.proposals;
    }),
  );

  const reject = async (id: number) => {
    try {
      await rejectVocabularyProposal(id);
      refresh();
    } catch (e) {
      setActionError(String((e as Error).message ?? e));
    }
  };

  return (
    <>
      <p className="muted">
        {t.reviewQueue.vocabulary.introPrefix} <code>vocabulary.approve</code> {t.reviewQueue.vocabulary.introSuffix}
      </p>
      <FilterToolbar total={<span className="muted docs-total">{meta.total} {meta.total === 1 ? t.reviewQueue.vocabulary.totalOne : t.reviewQueue.vocabulary.totalMany}</span>} />
      {(error || actionError) && <p className="error">{error || actionError}</p>}
      {msg && <p className="notice notice--neutral">{msg}</p>}
      {loading ? (
        <p className="muted">{t.common.loading}</p>
      ) : proposals.length === 0 ? (
        <p className="muted">{t.reviewQueue.vocabulary.noProposals}</p>
      ) : (
        <ul className="proposal-list">
          {proposals.map((p) => (
            <li key={p.id} className={`proposal-card ${p.proposed_by_source === 'ai_agent' ? 'ai-marked' : ''}`}>
              <div className="proposal-head">
                {p.proposed_by_source === 'ai_agent' && <span className="ai-pill">AI</span>}
                <code>{p.facet}</code>
                <strong>{p.proposed_value}</strong>
                {p.variant_of && (
                  <span className="muted">
                    {t.reviewQueue.vocabulary.looksLikePrefix}{p.variant_of.id}
                    {p.variant_of.similarity != null ? ` (${formatPercent(p.variant_of.similarity * 100, locale)})` : ''}
                  </span>
                )}
              </div>
              <div className="timeline-meta">
                {t.reviewQueue.vocabulary.proposedByPrefix} {p.proposed_by ?? p.proposed_by_source}
                {p.source_document ? ` ${t.reviewQueue.vocabulary.fromDocumentPrefix} “${p.source_document.title}”` : ''}
              </div>
              {canApprove ? (
                <div className="proposal-actions">
                  <ApproveProposalControls
                    proposalId={p.id}
                    facet={p.facet as VocabularyFacet}
                    variantId={p.variant_of?.id ?? null}
                    hasVariant={Boolean(p.variant_of)}
                    onDone={(m) => { setMsg(m); refresh(); }}
                  />
                  <button className="btn btn-ghost" onClick={() => reject(p.id)}>{t.reviewQueue.vocabulary.reject}</button>
                </div>
              ) : (
                <p className="timeline-meta">{t.reviewQueue.vocabulary.awaitingApproval}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <Pager meta={meta} setPage={setPage} />
    </>
  );
}

// --- Expiry queue + succession handoff ---------------------------------------
// Sprint 7g Item 2 — pagination + visible total (the Documents-page fix
// applied here): `ReviewQueueController::expiry` now paginates at 50
// server-side (additive backend change this sprint).
function ExpiryQueue() {
  const t = useT();
  const [msg, setMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { rows: tasks, loading, error, meta, setPage, refresh } = usePaginatedQuery<ExpiryTask>(
    (page) => getExpiryQueue(page).then((r) => r.tasks),
  );

  return (
    <>
      <p className="muted">
        {t.reviewQueue.expiry.intro} {t.reviewQueue.expiry.introOldDocIs} <strong>{t.reviewQueue.expiry.introNeverRetired}</strong>{t.reviewQueue.expiry.introSuffix}
      </p>
      <FilterToolbar total={<span className="muted docs-total">{meta.total} {meta.total === 1 ? t.reviewQueue.expiry.totalOne : t.reviewQueue.expiry.totalMany}</span>} />
      {(error || actionError) && <p className="error">{error || actionError}</p>}
      {msg && <p className="notice notice--neutral">{msg}</p>}
      {loading ? (
        <p className="muted">{t.common.loading}</p>
      ) : tasks.length === 0 ? (
        <p className="muted">{t.reviewQueue.expiry.nothingExpiringPrefix} <code>php artisan reviews:scan-expiry</code> {t.reviewQueue.expiry.nothingExpiringSuffix}</p>
      ) : (
        <ul className="proposal-list">
          {tasks.map((t) => (
            <ExpiryRow key={t.task_id} task={t} onDone={(m) => { setMsg(m); refresh(); }} onError={setActionError} />
          ))}
        </ul>
      )}
      <Pager meta={meta} setPage={setPage} />
    </>
  );
}

// Sprint 7d (ADR-0024) part C — the INERT AI succession suggestion.
//
// It is a claim with its evidence attached: the relationship, the two compared
// passages and the score. Confirming it does not run any new write path — it
// pre-selects the proposed successor in the SAME <select> below and calls the SAME
// 7a `resolveExpiryTask`, which is the only writer of `predecessor_document_id`.
// "Also retire" is never pre-checked by a proposal.
function SuccessionProposalNotice({
  task,
  busy,
  onConfirm,
  onReject,
  onRepropose,
}: {
  task: ExpiryTask;
  busy: boolean;
  onConfirm: (successorUuid: string) => void;
  onReject: () => void;
  onRepropose: () => void;
}) {
  const t = useT();
  const p = task.ai_proposal;

  // Nothing proposed (no candidate, no text, comparison down). Say why rather
  // than showing an empty box the human has to interpret.
  if (p && p.relationship === null) {
    return (
      <p className="notice notice--neutral">
        <span aria-hidden="true">✨</span>
        {t.reviewQueue.expiry.noSuggestion} {p.reason ?? t.common.dash}
        <button className="btn btn-ghost" disabled={busy} onClick={onRepropose}>{t.reviewQueue.expiry.retry}</button>
      </p>
    );
  }
  if (!p || !task.is_ai_proposed) {
    // Already confirmed or rejected (or never proposed) — the row stays plain, and
    // the human's own choice below is unaffected.
    return task.ai_proposal_status === 'rejected' ? (
      <p className="timeline-meta">{t.reviewQueue.expiry.aiRejectedNotice}</p>
    ) : null;
  }

  const label: Record<string, string> = {
    successor: t.reviewQueue.expiry.relationshipLabels.successor,
    conflict: t.reviewQueue.expiry.relationshipLabels.conflict,
    coexisting_sibling: t.reviewQueue.expiry.relationshipLabels.coexistingSibling,
    uncertain: t.reviewQueue.expiry.relationshipLabels.uncertain,
  };

  return (
    <div className="notice notice--ai">
      <span aria-hidden="true">✨</span>
      <div className="notice-body">
        <p style={{ margin: 0 }}>
          <span className="ai-pill">AI</span>{' '}
          <strong>{label[p.relationship ?? 'uncertain']}</strong> {t.reviewQueue.expiry.unverifiedNotWritten}
          {p.candidate_title && <> {t.reviewQueue.expiry.candidatePrefix} <strong>{p.candidate_title}</strong></>}
          {p.max_score != null && <span className="muted"> {t.reviewQueue.expiry.overlapPrefix} {p.max_score.toFixed(3)}</span>}
        </p>
        {p.validity && (
          <p className="timeline-meta" style={{ margin: 0 }}>
            {t.reviewQueue.expiry.thisDocumentPrefix} {p.validity.expiring[0] ?? t.common.dash} → {p.validity.expiring[1] ?? t.common.dash} ·
            {t.reviewQueue.expiry.candidatePairPrefix} {p.validity.candidate[0] ?? t.common.dash} → {p.validity.candidate[1] ?? t.common.dash}
            {p.relationship === 'successor' && ` ${t.reviewQueue.expiry.strictlyLaterSuffix}`}
          </p>
        )}
        {p.uncertainty && <p className="ai-facet" style={{ margin: 0 }}>⚠ {p.uncertainty.reason}</p>}

        {/* The compared passages, side by side. Without them the label is just an
            assertion, and a human cannot check an assertion. */}
        {(p.passages ?? []).map((pp, i) => (
          <div className="compare-grid" key={pp.candidate_chunk_id ?? i}>
            <div className="compare-side">
              <span className="muted">{t.reviewQueue.expiry.thisDocumentLabel}</span>
              <blockquote className="well passage-text">{pp.expiring_excerpt}</blockquote>
            </div>
            <div className="compare-side">
              <span className="muted">{t.reviewQueue.expiry.candidateScorePrefix} {pp.score.toFixed(3)}</span>
              <blockquote className="well passage-text">{pp.candidate_excerpt}</blockquote>
            </div>
          </div>
        ))}

        <div className="proposal-actions">
          {p.relationship === 'successor' && p.candidate_document_uuid && (
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => onConfirm(p.candidate_document_uuid as string)}
            >
              {t.reviewQueue.expiry.confirmSuccession}
            </button>
          )}
          <button className="btn btn-ghost" disabled={busy} onClick={onReject}>{t.reviewQueue.expiry.rejectSuggestion}</button>
        </div>
        {p.relationship !== 'successor' && (
          <p className="timeline-meta" style={{ margin: 0 }}>
            {t.reviewQueue.expiry.noSuccessionHint}
          </p>
        )}
      </div>
    </div>
  );
}

function ExpiryRow({ task, onDone, onError }: { task: ExpiryTask; onDone: (m: string) => void; onError: (e: string) => void }) {
  const t = useT();
  const [successor, setSuccessor] = useState('');
  const [retire, setRetire] = useState(false);
  const [busy, setBusy] = useState(false);

  const act = async (action: 'link_successor' | 'dismiss' | 'escalate', successorUuid = successor) => {
    setBusy(true);
    try {
      await resolveExpiryTask(task.task_id, {
        action,
        successor_uuid: action === 'link_successor' ? successorUuid : undefined,
        retire_predecessor: action === 'link_successor' ? retire : undefined,
        confirm_scope_change: action === 'link_successor' && retire ? true : undefined,
      });
      onDone(
        action === 'link_successor'
          ? (retire ? t.reviewQueue.expiry.linkedSuccessorRetired : t.reviewQueue.expiry.linkedSuccessorKept)
          : action === 'dismiss'
            ? t.reviewQueue.expiry.dismissed
            : t.reviewQueue.expiry.escalatedForAdjudication,
      );
    } catch (e) {
      onError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const rejectProposal = async () => {
    setBusy(true);
    try {
      await rejectSuccessionProposal(task.task_id);
      // The task stays OPEN: the document is still expiring, so rejecting a
      // suggestion is not resolving the queue item.
      onDone(t.reviewQueue.expiry.aiRejectedTaskOpen);
    } catch (e) {
      onError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const repropose = async () => {
    setBusy(true);
    try {
      await proposeSuccession(task.task_id);
      onDone(t.reviewQueue.expiry.queuedForComparison);
    } catch (e) {
      onError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const d = task.document;
  return (
    <li className={`proposal-card ${task.is_ai_proposed ? 'ai-marked' : ''}`}>
      <div className="proposal-head">
        {task.past && <span className="badge badge-conflict">⚠ {t.reviewQueue.expiry.pastBadge}</span>}
        <strong>{d?.title ?? t.common.dash}</strong>
        <span className="muted">· {d?.convenio ? `${d.convenio.numero} ${d.convenio.name}` : t.reviewQueue.expiry.noConvenio}</span>
      </div>
      <div className="timeline-meta">
        {t.reviewQueue.expiry.validPrefix} {d?.validity_start ?? t.common.dash} → {d?.validity_end ?? t.common.dash} · {d?.retrieval_status}
      </div>

      {!task.is_unscoped && (
        <SuccessionProposalNotice
          task={task}
          busy={busy}
          // Confirming pre-selects the proposal in the picker below and runs the
          // unchanged 7a write. `retire` is whatever the human left it as — a
          // proposal never turns it on.
          onConfirm={(uuid) => { setSuccessor(uuid); act('link_successor', uuid); }}
          onReject={rejectProposal}
          onRepropose={repropose}
        />
      )}

      {task.is_unscoped ? (
        <p className="notice"><span aria-hidden="true">⚠</span> {t.reviewQueue.expiry.noConvenioSuccessionNotice}</p>
      ) : (
        <div className="expiry-actions">
          <select className="select" value={successor} onChange={(e) => setSuccessor(e.target.value)}>
            <option value="">{t.reviewQueue.expiry.pickSuccessor}</option>
            {task.successor_candidates.map((c) => (
              <option key={c.uuid} value={c.uuid}>
                {c.title} ({c.validity_start ?? t.common.dash} → {c.validity_end ?? t.common.dash}) · {c.retrieval_status}
              </option>
            ))}
          </select>
          <label className="checkbox">
            <input type="checkbox" checked={retire} onChange={(e) => setRetire(e.target.checked)} />
            {t.reviewQueue.expiry.alsoRetire}
          </label>
          <button className="btn btn-primary" disabled={busy || !successor} onClick={() => act('link_successor')}>
            {retire ? t.reviewQueue.expiry.confirmSuccessionRetire : t.reviewQueue.expiry.confirmSuccessionButton}
          </button>
        </div>
      )}

      <div className="proposal-actions">
        <button className="btn btn-ghost" disabled={busy} onClick={() => act('dismiss')}>{t.reviewQueue.expiry.dismissAction}</button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => act('escalate')}>{t.reviewQueue.expiry.escalateAction}</button>
      </div>
    </li>
  );
}
