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
import { useT } from '../../i18n/context';

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
 *
 * Correction queue-source-01 — a manual create (admin_manual + needs_review,
 * the 7b-1 path) shows the neutral "Manual" badge instead: no excerpt/
 * confidence/uncertainty to show (only the segmentation agent ever writes
 * those columns), and it verifies through the SAME action below.
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
  const t = useT();
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
          <div className="detail-head"><strong>{t.referenceFactPanel.heading}</strong><button className="btn btn-ghost" onClick={onClose}>✕</button></div>
          <div className="detail-body"><p className="error">{error}</p></div>
        </aside>
      </div>
    );
  }
  if (!fact) {
    return (
      <div className="detail-backdrop" onClick={onClose}>
        <aside className="detail panel" onClick={(e) => e.stopPropagation()}>
          <div className="detail-head"><strong>{t.referenceFactPanel.heading}</strong><button className="btn btn-ghost" onClick={onClose}>✕</button></div>
          <div className="detail-body"><p className="muted">{t.referenceFactPanel.loadingText}</p></div>
        </aside>
      </div>
    );
  }

  const validity = fact.validity_start ? `${fact.validity_start} → ${fact.validity_end ?? t.common.dash}` : t.common.dash;
  const isAi = fact.is_ai_proposed; // ai_agent + needs_review → fuchsia
  const confidencePct = fact.confidence != null ? `${Math.round(fact.confidence * 100)}%` : null;

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <aside
        className={`detail panel${isAi ? ' ai-marked' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t.referenceFactPanel.heading}
      >
        <div className="detail-head">
          <strong>{t.referenceFactPanel.heading}</strong>
          <span className="badge badge-reference">{t.referenceFactPanel.typeBadge}</span>
          {isAi && <span className="ai-pill">{t.referenceFactPanel.aiProposalBadge}</span>}
          {/* Correction queue-source-01 — the detail panel's OTHER source
              badge, same needs_review gate as `isAi` (mutually exclusive). */}
          {fact.is_manual_pending && <span className="badge badge-manual">{t.referenceFactPanel.manualBadge}</span>}
          {fact.status === 'verified' && <span className="badge badge-verified">{t.referenceFactPanel.badgeVerified}</span>}
          {fact.status === 'needs_review' && <span className="badge badge-review">{t.referenceFactPanel.badgeNeedsReview}</span>}
          {fact.status === 'rejected' && <span className="badge badge-review">{t.referenceFactPanel.badgeRejected}</span>}
          <button className="btn btn-ghost" onClick={onClose} aria-label={t.referenceFactPanel.closeAriaLabel}>✕</button>
        </div>
        <div className="detail-body">
          {!canEdit && (
            <p className="notice notice--neutral">
              <span aria-hidden="true">🔒</span>
              {t.referenceFactPanel.readOnlyNoticePrefix} <code>knowledge.edit</code> {t.referenceFactPanel.readOnlyNoticeSuffix}
            </p>
          )}

          {isAi && (
            <div className="notice notice--ai">
              <p style={{ margin: 0 }}>
                <span aria-hidden="true">✨</span>{' '}
                <strong>{t.referenceFactPanel.aiProposalNoticeBold}</strong> {t.referenceFactPanel.aiProposalNoticeRest}
              </p>
              <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                {t.referenceFactPanel.confidencePrefix} {confidencePct ?? t.common.dash}
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
                  <strong>{t.referenceFactPanel.versionDuplicateBold}</strong> {t.referenceFactPanel.versionDuplicatePrefix}{fact.duplicate_of.value}{t.referenceFactPanel.versionDuplicateSuffix}
                </span>
                {canEdit && onResolveDuplicate && (
                  <button className="btn btn-primary" onClick={() => onResolveDuplicate(fact.uuid)}>
                    {t.referenceFactPanel.resolveDuplicateButton}
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
                  <strong>{t.referenceFactPanel.supersededBold}</strong> {t.referenceFactPanel.supersededByPrefix}{fact.superseded_by?.value ?? t.common.dash}{t.referenceFactPanel.supersededBySuffix}
                  {fact.superseded_by?.validity_start ? ` ${t.referenceFactPanel.supersededSincePrefix} ${fact.superseded_by.validity_start}${t.referenceFactPanel.supersededSinceSuffix}` : ''} —{' '}
                  {t.referenceFactPanel.supersededTrailing}
                </>
              )}
              {fact.resolution === 'supersedes' && <><strong>{t.referenceFactPanel.supersedesBold}</strong> {t.referenceFactPanel.supersedesTrailing}</>}
              {fact.resolution === 'coexists' && <><strong>{t.referenceFactPanel.coexistsBold}</strong> {t.referenceFactPanel.coexistsTrailing}</>}
              {fact.resolution === 'rejected_duplicate' && <><strong>{t.referenceFactPanel.rejectedDuplicateBold}</strong> {t.referenceFactPanel.rejectedDuplicateTrailing}</>}
              {fact.resolved_by && <span className="muted"> · {fact.resolved_by} · {fact.resolved_at}</span>}
            </p>
          )}

          {(fact.status === 'needs_review') && (
            <p className="notice">
              <span aria-hidden="true">⚠</span>
              <strong>{t.referenceFactPanel.inertNoticeBold}</strong> — {t.referenceFactPanel.inertNoticeRest}
            </p>
          )}

          {isAi && fact.source_excerpt && (
            <section>
              <h4>{t.referenceFactPanel.sourceLineHeading}</h4>
              <blockquote className="ai-suggestions" style={{ whiteSpace: 'pre-wrap' }}>{fact.source_excerpt}</blockquote>
            </section>
          )}

          <section>
            <h4>{t.referenceFactPanel.valueHeading}</h4>
            <p className="fact-value">{fact.value}</p>
            {fact.raw_values && (
              <details>
                <summary className="muted">{t.referenceFactPanel.rawValuesSummary}</summary>
                <pre className="raw-values">{JSON.stringify(fact.raw_values, null, 2)}</pre>
              </details>
            )}
          </section>

          <section>
            <h4>{t.referenceFactPanel.scopeHeading}</h4>
            <div className="facets">
              <Facet label={t.common.convenio} value={fact.scope.convenio ? `${fact.scope.convenio.numero} — ${fact.scope.convenio.name}` : t.common.dash} />
              <Facet label={t.common.territory} value={fact.scope.territory ? `${fact.scope.territory.name} (${fact.scope.territory.level})` : t.common.dash} derived />
              <Facet label={t.common.sector} value={fact.scope.sector?.name ?? t.common.dash} derived />
              <Facet label={t.common.jobCategory} value={fact.scope.job_category?.name ?? t.referenceFactPanel.noJobCategoryFallback} />
              {fact.scope.group_label && <Facet label={t.referenceFactPanel.groupLabel} value={fact.scope.group_label} />}
              <Facet label={t.common.topic} value={fact.topic?.name ?? t.common.dash} />
              <Facet label={t.common.validity} value={validity} />
            </div>
            <dl className="kv">
              <dt>{t.referenceFactPanel.authorityLabel}</dt>
              <dd>
                <span className="authority-lock" title={t.referenceFactPanel.authorityLockTitle}>
                  <span aria-hidden="true">🔒</span> {fact.authority_level}
                </span>
              </dd>
              <dt>{t.referenceFactPanel.sourceLabel}</dt><dd>{fact.source === 'admin_manual' ? t.referenceFactPanel.sourceManual : fact.source}</dd>
              <dt>{t.referenceFactPanel.statusLabel}</dt><dd>{fact.status}{fact.verified_by ? ` · ${t.referenceFactPanel.verifiedByPrefix} ${fact.verified_by}` : ''}{fact.verified_at ? ` · ${fact.verified_at}` : ''}</dd>
            </dl>
          </section>

          <section>
            <h4>{t.referenceFactPanel.sourceLabel}</h4>
            {fact.source_document ? (
              <p>
                <button className="btn btn-ghost btn-inline" onClick={() => onOpenDocument?.(fact.source_document!.uuid)}>
                  {fact.source_document.title}
                </button>
                {fact.source_locator && <span className="muted"> · {fact.source_locator}</span>}
              </p>
            ) : (
              <p className="muted">{t.referenceFactPanel.noSourceDocLinked}{fact.source_locator ? ` · ${fact.source_locator}` : ''}.</p>
            )}
          </section>

          {canEdit && (
            <section>
              <div className="detail-actions">
                {fact.status === 'needs_review' && (
                  <button className="btn btn-primary" onClick={verify} disabled={busy}>
                    {busy ? t.referenceFactPanel.verifying : isAi ? t.referenceFactPanel.verifyProposal : t.referenceFactPanel.verifyFact}
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => setEditing((e) => !e)} disabled={busy}>
                  {editing ? t.referenceFactPanel.cancelEdit : isAi && fact.status === 'needs_review' ? t.referenceFactPanel.fixThenVerify : t.referenceFactPanel.editButton}
                </button>
                {isAi && fact.status === 'needs_review' && (
                  <button className="btn btn-ghost" onClick={reject} disabled={busy}>
                    {busy ? t.referenceFactPanel.rejecting : t.referenceFactPanel.rejectButton}
                  </button>
                )}
                {isAi && fact.source_document && (
                  <button className="btn btn-ghost" onClick={resegment} disabled={busy} title={t.referenceFactPanel.resegmentTitle}>
                    {t.referenceFactPanel.resegmentButton}
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
            <h4>{t.referenceFactPanel.provenanceHeading}</h4>
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
                    <div className="timeline-meta">{e.created_at}{e.actor_id ? ` · ${t.referenceFactPanel.adminHashPrefix}${e.actor_id}` : ''}</div>
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
  const t = useT();
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
        <label className="field-label">{t.referenceFactPanel.valueHeading}</label>
        <textarea className="textarea" value={value} onChange={(e) => setValue(e.target.value)} rows={3} />
      </div>
      <div className="field-row">
        <div className="field">
          <label className="field-label">{t.referenceFactPanel.validityStartLabel}</label>
          <input className="input" type="date" value={validityStart} onChange={(e) => setValidityStart(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">{t.referenceFactPanel.validityEndLabel}</label>
          <input className="input" type="date" value={validityEnd} onChange={(e) => setValidityEnd(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label className="field-label">{t.referenceFactPanel.sourceLocatorLabel}</label>
        <input className="input" value={locator} onChange={(e) => setLocator(e.target.value)} placeholder={t.referenceFactPanel.sourceLocatorPlaceholder} />
      </div>
      <p className="muted">{t.referenceFactPanel.authorityLockedPrefix} <code>{REFERENCE_AUTHORITY_LEVEL}</code> {t.referenceFactPanel.authorityLockedSuffix}</p>
      <div className="detail-actions">
        <button className="btn btn-primary" onClick={() => save(false)} disabled={busy}>{busy ? t.referenceFactPanel.saving : t.common.save}</button>
      </div>

      {confirmScope && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t.referenceFactPanel.confirmScopeChangeAriaLabel}>
          <div className="modal">
            <h4 className="modal-title"><span aria-hidden="true">⚠</span> {t.referenceFactPanel.scopeChangeTitle}</h4>
            <p className="modal-body">{t.referenceFactPanel.scopeChangeBody}</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmScope(false)} disabled={busy}>{t.common.cancel}</button>
              <button className="btn btn-warning" onClick={() => save(true)} disabled={busy}>{t.referenceFactPanel.confirmChangeButton}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
