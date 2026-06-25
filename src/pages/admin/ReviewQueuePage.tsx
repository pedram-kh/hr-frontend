import { useCallback, useEffect, useState } from 'react';
import {
  getExpiryQueue,
  listDocuments,
  listVocabularyProposals,
  rejectVocabularyProposal,
  resolveExpiryTask,
  type DocumentRow,
  type ExpiryTask,
  type VocabularyFacet,
  type VocabularyProposal,
} from '../../lib/api';
import { DocumentDetailPanel } from './DocumentDetailPanel';
import { ApproveProposalControls } from './ProposeVocabularyForm';

type Tab = 'tagging' | 'vocabulary' | 'expiry';

// Sprint 7a — the messy-tail review surfaces, in one place: the AI tagging
// backlog (verify reuses the Sprint-3 Confirm UI), the proposed-vocabulary list
// (approve = vocabulary.approve), and the expiry queue (human-confirmed
// succession). Fuchsia marks unverified-AI ONLY.
export function ReviewQueuePage() {
  const [tab, setTab] = useState<Tab>('tagging');
  return (
    <div className="review-queue">
      <div className="tabs">
        <button className={`tab ${tab === 'tagging' ? 'active' : ''}`} onClick={() => setTab('tagging')}>AI tagging</button>
        <button className={`tab ${tab === 'vocabulary' ? 'active' : ''}`} onClick={() => setTab('vocabulary')}>Vocabulary proposals</button>
        <button className={`tab ${tab === 'expiry' ? 'active' : ''}`} onClick={() => setTab('expiry')}>Expiry</button>
      </div>
      {tab === 'tagging' && <TaggingQueue />}
      {tab === 'vocabulary' && <VocabularyQueue />}
      {tab === 'expiry' && <ExpiryQueue />}
    </div>
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

function ExpiryRow({ task, onDone, onError }: { task: ExpiryTask; onDone: (m: string) => void; onError: (e: string) => void }) {
  const [successor, setSuccessor] = useState('');
  const [retire, setRetire] = useState(false);
  const [busy, setBusy] = useState(false);

  const act = async (action: 'link_successor' | 'dismiss' | 'escalate') => {
    setBusy(true);
    try {
      await resolveExpiryTask(task.task_id, {
        action,
        successor_uuid: action === 'link_successor' ? successor : undefined,
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

  const d = task.document;
  return (
    <li className="proposal-card">
      <div className="proposal-head">
        {task.past && <span className="badge badge-conflict">⚠ Past</span>}
        <strong>{d?.title ?? '—'}</strong>
        <span className="muted">· {d?.convenio ? `${d.convenio.numero} ${d.convenio.name}` : 'no convenio'}</span>
      </div>
      <div className="timeline-meta">
        valid {d?.validity_start ?? '—'} → {d?.validity_end ?? '—'} · {d?.retrieval_status}
      </div>

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
