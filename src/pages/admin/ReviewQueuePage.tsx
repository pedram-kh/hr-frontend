import { useCallback, useEffect, useState } from 'react';
import {
  getExpiryQueue,
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
  type VocabularyProposal,
} from '../../lib/api';
import { DocumentDetailPanel } from './DocumentDetailPanel';
import { GroupsQueue } from './GroupsQueue';
import { FactDuplicatePanel } from './FactDuplicatePanel';
import { ReferenceFactPanel } from './ReferenceFactPanel';
import { ApproveProposalControls } from './ProposeVocabularyForm';

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
  return (
    <div className="review-queue">
      <div className="tabs">
        <button className={`tab ${tab === 'tagging' ? 'active' : ''}`} onClick={() => setTab('tagging')}>AI tagging</button>
        <button className={`tab ${tab === 'reference-facts' ? 'active' : ''}`} onClick={() => setTab('reference-facts')}>Reference facts</button>
        <button className={`tab ${tab === 'groups' ? 'active' : ''}`} onClick={() => setTab('groups')}>Groups</button>
        <button className={`tab ${tab === 'vocabulary' ? 'active' : ''}`} onClick={() => setTab('vocabulary')}>Vocabulary proposals</button>
        <button className={`tab ${tab === 'expiry' ? 'active' : ''}`} onClick={() => setTab('expiry')}>Expiry</button>
      </div>
      {tab === 'tagging' && <TaggingQueue />}
      {tab === 'reference-facts' && <ReferenceFactsQueue initialFactUuid={initialFactUuid} />}
      {tab === 'groups' && <GroupsQueue initialConvenioId={initialConvenioId} />}
      {tab === 'vocabulary' && <VocabularyQueue />}
      {tab === 'expiry' && <ExpiryQueue />}
    </div>
  );
}

// --- AI-segmented reference facts (Sprint 7b-2) -------------------------------
// The riskiest queue: each row is an AI scope-assignment. UNCERTAIN-FIRST so a
// flagged fact (scope unclear / compound group / possible version) floats to the
// top, then the least-confident. Open one to check the source line against the
// assigned scope, then verify / fix-then-verify / reject. Inert until verified
// (not answerable — answering is a later sprint).
function ReferenceFactsQueue({ initialFactUuid = null }: { initialFactUuid?: string | null }) {
  const [rows, setRows] = useState<ReferenceFactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Sprint 7g Item 2 — a `#fact=<uuid>` deep link opens straight to that
  // fact's detail panel (below), whether or not it happens to be in the
  // CURRENT queue filter — `ReferenceFactPanel` fetches its own detail by
  // uuid, independent of the list.
  const [selected, setSelected] = useState<string | null>(initialFactUuid);
  // Sprint 7d — the version pair opens its own side-by-side surface, because the
  // question ("which of these two is true, and since when?") is about the PAIR,
  // not about either fact alone.
  const [pairUuid, setPairUuid] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    listReferenceFacts({ queue: 'true' })
      .then((p) => setRows(p.facts.data))
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  return (
    <>
      <p className="muted">
        AI-segmented reference facts awaiting verification — <strong>uncertain-first</strong>, then lowest-confidence.
        Inert (fuchsia, not answerable) until a human verifies. Open one to check the source line against the assigned scope.
      </p>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <table className="docs-table">
          <thead>
            <tr><th>Value</th><th>Scope</th><th>Group</th><th className="num">Conf.</th><th>Flags</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.uuid}
                className={`${selected === r.uuid ? 'is-selected' : ''} ${r.is_ai_proposed ? 'ai-marked' : ''}`}
                onClick={() => setSelected(r.uuid)}
              >
                <td className="cell-clip">{r.value}</td>
                <td>{[r.territory, r.sector].filter(Boolean).join(' · ') || r.convenio || '—'}</td>
                <td>{r.group_label ?? r.job_category ?? '—'}</td>
                <td className="num">{r.confidence != null ? `${Math.round(r.confidence * 100)}%` : '—'}</td>
                <td className="flags">
                  {r.is_ai_proposed && <span className="ai-pill">AI</span>}
                  {r.uncertainty && <span className="badge badge-conflict">⚠ {r.uncertainty.field}</span>}
                  {r.is_unresolved_duplicate && <span className="badge badge-conflict">≈ version</span>}
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
                      Resolver versión
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="col-empty">No AI-proposed facts awaiting review — the queue is clear.</td></tr>
            )}
          </tbody>
        </table>
      )}
      {selected && (
        <ReferenceFactPanel
          uuid={selected}
          onClose={() => setSelected(null)}
          onChanged={refresh}
          onResolveDuplicate={setPairUuid}
        />
      )}
      {pairUuid && (
        <FactDuplicatePanel uuid={pairUuid} onClose={() => setPairUuid(null)} onChanged={refresh} />
      )}
    </>
  );
}

// --- AI tagging backlog -------------------------------------------------------
function TaggingQueue() {
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    listDocuments({ tagging_status: 'under_review', sort: 'confidence' })
      .then((p) => setRows(p.data))
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  return (
    <>
      <p className="muted">
        Documents <code>under_review</code> — not retrievable until verified. The AI auto-proposes facets on ingest; lowest-confidence first.
        Open one to review the (fuchsia) AI suggestions and Confirm.
      </p>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <table className="docs-table">
          <thead>
            <tr><th>Title</th><th>Convenio</th><th>Type</th><th className="num">Confidence</th><th>Flags</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.uuid}
                className={`${selected === r.uuid ? 'is-selected' : ''} ${r.is_ai_proposed ? 'ai-marked' : ''}`}
                onClick={() => setSelected(r.uuid)}
              >
                <td>{r.title}</td>
                <td>{r.convenio ?? '—'}</td>
                <td>{r.document_type ?? '—'}</td>
                <td className="num">{r.tagging_confidence != null ? `${Math.round(r.tagging_confidence * 100)}%` : '—'}</td>
                <td className="flags">
                  {r.is_ai_proposed && <span className="ai-pill">AI</span>}
                  {r.has_open_conflict && <span className="badge badge-conflict">⚠ Conflict</span>}
                  {r.empty_text && <span className="badge badge-empty">∅ No text</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="col-empty">Nothing under review — the queue is clear.</td></tr>
            )}
          </tbody>
        </table>
      )}
      {selected && <DocumentDetailPanel uuid={selected} onClose={() => setSelected(null)} onChanged={refresh} />}
    </>
  );
}

// --- Vocabulary proposals -----------------------------------------------------
function VocabularyQueue() {
  const [proposals, setProposals] = useState<VocabularyProposal[]>([]);
  const [canApprove, setCanApprove] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    listVocabularyProposals('proposed')
      .then((r) => {
        setProposals(r.proposals);
        setCanApprove(r.can_approve);
      })
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  const reject = async (id: number) => {
    try {
      await rejectVocabularyProposal(id);
      refresh();
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  };

  return (
    <>
      <p className="muted">
        Proposed vocabulary (variant→alias is the default; create-new is deliberate). Approving writes into the controlled vocabulary —
        gated by <code>vocabulary.approve</code> (super_admin). The AI proposes only.
      </p>
      {error && <p className="error">{error}</p>}
      {msg && <p className="notice notice--neutral">{msg}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : proposals.length === 0 ? (
        <p className="muted">No open vocabulary proposals.</p>
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
                    · looks like #{p.variant_of.id}
                    {p.variant_of.similarity != null ? ` (${Math.round(p.variant_of.similarity * 100)}%)` : ''}
                  </span>
                )}
              </div>
              <div className="timeline-meta">
                proposed by {p.proposed_by ?? p.proposed_by_source}
                {p.source_document ? ` · from “${p.source_document.title}”` : ''}
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
                  <button className="btn btn-ghost" onClick={() => reject(p.id)}>Reject</button>
                </div>
              ) : (
                <p className="timeline-meta">Awaiting a super_admin to approve.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// --- Expiry queue + succession handoff ---------------------------------------
function ExpiryQueue() {
  const [tasks, setTasks] = useState<ExpiryTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    getExpiryQueue()
      .then((r) => setTasks(r.tasks))
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  return (
    <>
      <p className="muted">
        Active prose within 90 days of expiry (or already past). Confirm a successor (same convenio only) to write the lineage —
        the old document is <strong>never auto-retired</strong>.
      </p>
      {error && <p className="error">{error}</p>}
      {msg && <p className="notice notice--neutral">{msg}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="muted">Nothing expiring — the queue is clear. (Run <code>php artisan reviews:scan-expiry</code> to refresh.)</p>
      ) : (
        <ul className="proposal-list">
          {tasks.map((t) => (
            <ExpiryRow key={t.task_id} task={t} onDone={(m) => { setMsg(m); refresh(); }} onError={setError} />
          ))}
        </ul>
      )}
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
  const p = task.ai_proposal;

  // Nothing proposed (no candidate, no text, comparison down). Say why rather
  // than showing an empty box the human has to interpret.
  if (p && p.relationship === null) {
    return (
      <p className="notice notice--neutral">
        <span aria-hidden="true">✨</span>
        Sin sugerencia de sucesión: {p.reason ?? '—'}
        <button className="btn btn-ghost" disabled={busy} onClick={onRepropose}>Reintentar</button>
      </p>
    );
  }
  if (!p || !task.is_ai_proposed) {
    // Already confirmed or rejected (or never proposed) — the row stays plain, and
    // the human's own choice below is unaffected.
    return task.ai_proposal_status === 'rejected' ? (
      <p className="timeline-meta">Sugerencia de IA rechazada — sin efecto sobre el documento.</p>
    ) : null;
  }

  const label: Record<string, string> = {
    successor: 'Sucesor propuesto',
    conflict: 'Posible conflicto (no sucesión)',
    coexisting_sibling: 'Documentos que coexisten (no sucesión)',
    uncertain: 'Sin relación afirmada',
  };

  return (
    <div className="notice notice--ai">
      <span aria-hidden="true">✨</span>
      <div className="notice-body">
        <p style={{ margin: 0 }}>
          <span className="ai-pill">AI</span>{' '}
          <strong>{label[p.relationship ?? 'uncertain']}</strong> — sin verificar, no se ha escrito nada.
          {p.candidate_title && <> Candidato: <strong>{p.candidate_title}</strong></>}
          {p.max_score != null && <span className="muted"> · solapamiento {p.max_score.toFixed(3)}</span>}
        </p>
        {p.validity && (
          <p className="timeline-meta" style={{ margin: 0 }}>
            este documento {p.validity.expiring[0] ?? '—'} → {p.validity.expiring[1] ?? '—'} ·
            candidato {p.validity.candidate[0] ?? '—'} → {p.validity.candidate[1] ?? '—'}
            {p.relationship === 'successor' && ' (vigencia estrictamente posterior)'}
          </p>
        )}
        {p.uncertainty && <p className="ai-facet" style={{ margin: 0 }}>⚠ {p.uncertainty.reason}</p>}

        {/* The compared passages, side by side. Without them the label is just an
            assertion, and a human cannot check an assertion. */}
        {(p.passages ?? []).map((pp, i) => (
          <div className="compare-grid" key={pp.candidate_chunk_id ?? i}>
            <div className="compare-side">
              <span className="muted">Este documento</span>
              <blockquote className="well passage-text">{pp.expiring_excerpt}</blockquote>
            </div>
            <div className="compare-side">
              <span className="muted">Candidato · {pp.score.toFixed(3)}</span>
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
              Confirmar esta sucesión
            </button>
          )}
          <button className="btn btn-ghost" disabled={busy} onClick={onReject}>Rechazar sugerencia</button>
        </div>
        {p.relationship !== 'successor' && (
          <p className="timeline-meta" style={{ margin: 0 }}>
            La IA no propone una sucesión aquí; si crees que la hay, elígela abajo a mano.
          </p>
        )}
      </div>
    </div>
  );
}

function ExpiryRow({ task, onDone, onError }: { task: ExpiryTask; onDone: (m: string) => void; onError: (e: string) => void }) {
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
          ? `Linked successor${retire ? ' and retired the old document.' : ' (old document kept active).'}`
          : action === 'dismiss'
            ? 'Dismissed.'
            : 'Escalated for adjudication.',
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
      onDone('Sugerencia de IA rechazada — no se ha escrito ninguna relación; la tarea sigue abierta.');
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
      onDone('Comparación en cola — vuelve a cargar en unos segundos.');
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
        {task.past && <span className="badge badge-conflict">⚠ Past</span>}
        <strong>{d?.title ?? '—'}</strong>
        <span className="muted">· {d?.convenio ? `${d.convenio.numero} ${d.convenio.name}` : 'no convenio'}</span>
      </div>
      <div className="timeline-meta">
        valid {d?.validity_start ?? '—'} → {d?.validity_end ?? '—'} · {d?.retrieval_status}
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
        <p className="notice"><span aria-hidden="true">⚠</span> No convenio — succession is scope-based, so no same-convenio successor can be linked. Dismiss or escalate.</p>
      ) : (
        <div className="expiry-actions">
          <select className="select" value={successor} onChange={(e) => setSuccessor(e.target.value)}>
            <option value="">Pick the successor (same convenio)…</option>
            {task.successor_candidates.map((c) => (
              <option key={c.uuid} value={c.uuid}>
                {c.title} ({c.validity_start ?? '—'} → {c.validity_end ?? '—'}) · {c.retrieval_status}
              </option>
            ))}
          </select>
          <label className="checkbox">
            <input type="checkbox" checked={retire} onChange={(e) => setRetire(e.target.checked)} />
            Also retire this one (historical)
          </label>
          <button className="btn btn-primary" disabled={busy || !successor} onClick={() => act('link_successor')}>
            {retire ? 'Confirm succession + retire' : 'Confirm succession'}
          </button>
        </div>
      )}

      <div className="proposal-actions">
        <button className="btn btn-ghost" disabled={busy} onClick={() => act('dismiss')}>Dismiss (renewed in place / no action)</button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => act('escalate')}>Escalate</button>
      </div>
    </li>
  );
}
