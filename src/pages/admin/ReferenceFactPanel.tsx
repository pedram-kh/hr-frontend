import { useEffect, useState } from 'react';
import {
  ApiError,
  canEditKnowledge,
  getReferenceFact,
  rejectReferenceFact,
  segmentReferenceSource,
  updateReferenceFact,
  verifyReferenceFact,
  REFERENCE_AUTHORITY_LEVEL,
  type ReferenceFactCard,
  type UpdateReferenceFactPayload,
} from '../../lib/api';
import { useAuth } from '../../auth/context';

/**
 * The reference-fact card (Sprint 7b-1 / 7b-2, ADR-0021/0022) — the right-hand
 * panel a `fact:{uuid}` leaf opens. Mirrors the document card: scope (convenio +
 * DERIVED territory/sector + job category + group_label), topic, validity, the
 * AUTHORITY LOCK (the visible INVARIANT 1 — structured_reference, no higher
 * option), the source link + locator, raw_values verbatim, the append-only
 * provenance timeline, and — for knowledge.edit holders — the bounded edit + the
 * verify action (the 7a spine).
 *
 * Sprint 7b-2 — the review UX IS the safety. An AI-proposed fact (ai_agent +
 * needs_review) shows FUCHSIA, the source EXCERPT (the header trail + exact line,
 * so the reviewer checks "did the source say Álava?" in seconds), the confidence,
 * the structured uncertainty flag, and a possible-version flag. The human can
 * verify / fix-then-verify / reject. The agent NEVER verifies its own output —
 * the verify action is human-only.
 */
export function ReferenceFactPanel({
  uuid,
  onClose,
  onChanged,
  onOpenDocument,
  onResolveDuplicate,
}: {
  uuid: string;
  onClose: () => void;
  onChanged: () => void;
  onOpenDocument?: (uuid: string) => void;
  // Sprint 7d — hand the version pair to the side-by-side resolution surface.
  // Optional: where it isn't wired, the flag still reads as a flag (7b-2 behaviour).
  onResolveDuplicate?: (uuid: string) => void;
}) {
  const { identity } = useAuth();
  const canEdit = canEditKnowledge(identity);
  const [fact, setFact] = useState<ReferenceFactCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = () => {
    getReferenceFact(uuid)
      .then(setFact)
      .catch((e) => setError(String(e.message ?? e)));
  };
  useEffect(load, [uuid]);

  const verify = async () => {
    setBusy(true);
    try {
      await verifyReferenceFact(uuid);
      load();
      onChanged();
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    try {
      await rejectReferenceFact(uuid);
      load();
      onChanged();
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const resegment = async () => {
    if (!fact?.source_document) return;
    setBusy(true);
    try {
      await segmentReferenceSource(fact.source_document.uuid);
      onChanged();
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="detail-backdrop" onClick={onClose}>
        <aside className="detail panel" onClick={(e) => e.stopPropagation()}>
          <div className="detail-head"><strong>Reference fact</strong><button className="btn btn-ghost" onClick={onClose}>✕</button></div>
          <div className="detail-body"><p className="error">{error}</p></div>
        </aside>
      </div>
    );
  }
  if (!fact) {
    return (
      <div className="detail-backdrop" onClick={onClose}>
        <aside className="detail panel" onClick={(e) => e.stopPropagation()}>
          <div className="detail-head"><strong>Reference fact</strong><button className="btn btn-ghost" onClick={onClose}>✕</button></div>
          <div className="detail-body"><p className="muted">Loading…</p></div>
        </aside>
      </div>
    );
  }

  const validity = fact.validity_start ? `${fact.validity_start} → ${fact.validity_end ?? '—'}` : '—';
  const isAi = fact.is_ai_proposed; // ai_agent + needs_review → fuchsia
  const confidencePct = fact.confidence != null ? `${Math.round(fact.confidence * 100)}%` : null;

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <aside
        className={`detail panel${isAi ? ' ai-marked' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Reference fact"
      >
        <div className="detail-head">
          <strong>Reference fact</strong>
          <span className="badge badge-reference">dato</span>
          {isAi && <span className="ai-pill">AI proposal</span>}
          {fact.status === 'verified' && <span className="badge badge-verified">verified</span>}
          {fact.status === 'needs_review' && <span className="badge badge-review">needs review</span>}
          {fact.status === 'rejected' && <span className="badge badge-review">rejected</span>}
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="detail-body">
          {!canEdit && (
            <p className="notice notice--neutral">
              <span aria-hidden="true">🔒</span>
              Read-only — you don't have the <code>knowledge.edit</code> ability.
            </p>
          )}

          {isAi && (
            <div className="notice notice--ai">
              <p style={{ margin: 0 }}>
                <span aria-hidden="true">✨</span>{' '}
                <strong>AI-segmented proposal — unverified.</strong> Check the scope against the quoted
                source line below before verifying. The agent only proposes; it never verifies itself.
              </p>
              <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                Confidence: {confidencePct ?? '—'}
                {fact.uncertainty && (
                  <> · <span className="ai-facet">⚠ {fact.uncertainty.field}: {fact.uncertainty.reason}</span></>
                )}
              </p>
            </div>
          )}

          {/* Sprint 7d (ADR-0024) — the 7b-2 flag is now RESOLVABLE. The link is kept
              after resolution as the version lineage, so a resolved pair reads as
              history rather than as an open question. */}
          {fact.is_unresolved_duplicate && fact.duplicate_of && (
            <div className="notice">
              <span aria-hidden="true">⚠</span>
              <div className="notice-body">
                <span>
                  <strong>Possible version/duplicate</strong> — same scope as an existing fact with a
                  different value ("{fact.duplicate_of.value}"). Decide which is true, and since when.
                </span>
                {canEdit && onResolveDuplicate && (
                  <button className="btn btn-primary" onClick={() => onResolveDuplicate(fact.uuid)}>
                    Resolver versión (comparar lado a lado)
                  </button>
                )}
              </div>
            </div>
          )}

          {fact.resolution && (
            <p className="notice notice--neutral">
              <span aria-hidden="true">✓</span>
              {fact.resolution === 'superseded' && (
                <>
                  <strong>Sustituido</strong> por “{fact.superseded_by?.value ?? '—'}”
                  {fact.superseded_by?.validity_start ? ` (desde ${fact.superseded_by.validity_start})` : ''} — este
                  valor sigue siendo el correcto para su periodo de vigencia; no se ha borrado.
                </>
              )}
              {fact.resolution === 'supersedes' && <><strong>Sustituye</strong> a una versión anterior, cuya vigencia se cerró.</>}
              {fact.resolution === 'coexists' && <><strong>Coexiste</strong> con el hecho marcado: no son versiones del mismo dato.</>}
              {fact.resolution === 'rejected_duplicate' && <><strong>Descartado</strong> como duplicado incorrecto.</>}
              {fact.resolved_by && <span className="muted"> · {fact.resolved_by} · {fact.resolved_at}</span>}
            </p>
          )}

          {(fact.status === 'needs_review') && (
            <p className="notice">
              <span aria-hidden="true">⚠</span>
              <strong>Inert until verified</strong> — this fact is not answerable until a human verifies it
              {' '}(once verified, it can be served directly as a live answer).
            </p>
          )}

          {isAi && fact.source_excerpt && (
            <section>
              <h4>Source line (check the scope)</h4>
              <blockquote className="ai-suggestions" style={{ whiteSpace: 'pre-wrap' }}>{fact.source_excerpt}</blockquote>
            </section>
          )}

          <section>
            <h4>Value</h4>
            <p className="fact-value">{fact.value}</p>
            {fact.raw_values && (
              <details>
                <summary className="muted">Original (raw_values)</summary>
                <pre className="raw-values">{JSON.stringify(fact.raw_values, null, 2)}</pre>
              </details>
            )}
          </section>

          <section>
            <h4>Scope</h4>
            <div className="facets">
              <Facet label="Convenio" value={fact.scope.convenio ? `${fact.scope.convenio.numero} — ${fact.scope.convenio.name}` : '—'} />
              <Facet label="Territory" value={fact.scope.territory ? `${fact.scope.territory.name} (${fact.scope.territory.level})` : '—'} derived />
              <Facet label="Sector" value={fact.scope.sector?.name ?? '—'} derived />
              <Facet label="Job category" value={fact.scope.job_category?.name ?? '— (convenio-wide)'} />
              {fact.scope.group_label && <Facet label="Group" value={fact.scope.group_label} />}
              <Facet label="Topic" value={fact.topic?.name ?? '—'} />
              <Facet label="Validity" value={validity} />
            </div>
            <dl className="kv">
              <dt>Authority</dt>
              <dd>
                <span className="authority-lock" title="A reference fact can never outrank a convenio (enforced in schema + validation).">
                  <span aria-hidden="true">🔒</span> {fact.authority_level}
                </span>
              </dd>
              <dt>Source</dt><dd>{fact.source === 'admin_manual' ? 'manual' : fact.source}</dd>
              <dt>Status</dt><dd>{fact.status}{fact.verified_by ? ` · by ${fact.verified_by}` : ''}{fact.verified_at ? ` · ${fact.verified_at}` : ''}</dd>
            </dl>
          </section>

          <section>
            <h4>Source</h4>
            {fact.source_document ? (
              <p>
                <button className="btn btn-ghost btn-inline" onClick={() => onOpenDocument?.(fact.source_document!.uuid)}>
                  {fact.source_document.title}
                </button>
                {fact.source_locator && <span className="muted"> · {fact.source_locator}</span>}
              </p>
            ) : (
              <p className="muted">No source document linked{fact.source_locator ? ` · ${fact.source_locator}` : ''}.</p>
            )}
          </section>

          {canEdit && (
            <section>
              <div className="detail-actions">
                {fact.status === 'needs_review' && (
                  <button className="btn btn-primary" onClick={verify} disabled={busy}>
                    {busy ? 'Verifying…' : isAi ? 'Verify proposal' : 'Verify fact'}
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => setEditing((e) => !e)} disabled={busy}>
                  {editing ? 'Cancel edit' : isAi && fact.status === 'needs_review' ? 'Fix then verify' : 'Edit'}
                </button>
                {isAi && fact.status === 'needs_review' && (
                  <button className="btn btn-ghost" onClick={reject} disabled={busy}>
                    {busy ? 'Rejecting…' : 'Reject'}
                  </button>
                )}
                {isAi && fact.source_document && (
                  <button className="btn btn-ghost" onClick={resegment} disabled={busy} title="Re-run the segmentation agent on the source (idempotent upsert)">
                    Re-segment source
                  </button>
                )}
              </div>
              {editing && (
                <FactEditForm
                  fact={fact}
                  onDone={() => { setEditing(false); load(); onChanged(); }}
                  onError={setError}
                />
              )}
            </section>
          )}

          <section>
            <h4>Provenance</h4>
            <ol className="timeline">
              {fact.provenance.map((e, i) => (
                <li key={i} className="timeline-item">
                  <span className={`timeline-dot src-${e.source}`} aria-hidden="true" />
                  <div>
                    <span className="timeline-action">
                      {e.source.replace(/_/g, ' ')} · <code>{e.facet}</code>
                      {e.old_value ? <span className="timeline-old"> {e.old_value} →</span> : null}
                      {e.new_value ? <> <span className="timeline-value">{e.new_value}</span></> : null}
                    </span>
                    {e.note ? <div className="timeline-meta">{e.note}</div> : null}
                    <div className="timeline-meta">{e.created_at}{e.actor_id ? ` · admin #${e.actor_id}` : ''}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
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

/**
 * The bounded edit. A scope-affecting change (convenio / job_category / validity)
 * returns 409 from the server; we surface a confirm modal and resend with
 * confirm_scope_change=true (the Sprint-3 gate). Authority is NOT editable —
 * it is locked to structured_reference (INVARIANT 1).
 */
function FactEditForm({
  fact,
  onDone,
  onError,
}: {
  fact: ReferenceFactCard;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [value, setValue] = useState(fact.value);
  const [validityStart, setValidityStart] = useState(fact.validity_start ?? '');
  const [validityEnd, setValidityEnd] = useState(fact.validity_end ?? '');
  const [locator, setLocator] = useState(fact.source_locator ?? '');
  const [busy, setBusy] = useState(false);
  const [confirmScope, setConfirmScope] = useState(false);

  const buildPayload = (confirm: boolean): UpdateReferenceFactPayload => ({
    value: value !== fact.value ? value : undefined,
    validity_start: (validityStart || null) !== fact.validity_start ? (validityStart || null) : undefined,
    validity_end: (validityEnd || null) !== fact.validity_end ? (validityEnd || null) : undefined,
    source_locator: (locator || null) !== fact.source_locator ? (locator || null) : undefined,
    confirm_scope_change: confirm || undefined,
  });

  const save = async (confirm = false) => {
    setBusy(true);
    try {
      await updateReferenceFact(fact.uuid, buildPayload(confirm));
      onDone();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setConfirmScope(true); // a validity change is scope-affecting → confirm
        setBusy(false);
        return;
      }
      onError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fact-edit">
      <div className="field">
        <label className="field-label">Value</label>
        <textarea className="textarea" value={value} onChange={(e) => setValue(e.target.value)} rows={3} />
      </div>
      <div className="field-row">
        <div className="field">
          <label className="field-label">Validity start</label>
          <input className="input" type="date" value={validityStart} onChange={(e) => setValidityStart(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Validity end</label>
          <input className="input" type="date" value={validityEnd} onChange={(e) => setValidityEnd(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label className="field-label">Source locator</label>
        <input className="input" value={locator} onChange={(e) => setLocator(e.target.value)} placeholder="p.3 §2 / sheet:smi26" />
      </div>
      <p className="muted">Authority is locked to <code>{REFERENCE_AUTHORITY_LEVEL}</code> — it cannot be raised.</p>
      <div className="detail-actions">
        <button className="btn btn-primary" onClick={() => save(false)} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>

      {confirmScope && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm scope change">
          <div className="modal">
            <h4 className="modal-title"><span aria-hidden="true">⚠</span> Scope change</h4>
            <p className="modal-body">This changes the validity/scope of the fact (which employees it would answer). Confirm to apply.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmScope(false)} disabled={busy}>Cancel</button>
              <button className="btn btn-warning" onClick={() => save(true)} disabled={busy}>Confirm change</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
