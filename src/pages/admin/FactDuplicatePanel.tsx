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
import { useT } from '../../i18n/context';

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
  const t = useT();
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
          ? t.factDuplicatePanel.supersedeSuccessMsg
          : action === 'coexist'
            ? t.factDuplicatePanel.coexistSuccessMsg
            : t.factDuplicatePanel.rejectSuccessMsg,
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
      <aside className="detail panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t.factDuplicatePanel.heading}>
        <div className="detail-head">
          <strong>{t.factDuplicatePanel.heading}</strong>
          <button className="btn btn-ghost" onClick={onClose} aria-label={t.common.close}>✕</button>
        </div>
        <div className="detail-body">{body}</div>
      </aside>
    </div>
  );

  if (error && !pair) return shell(<p className="error">{error}</p>);
  if (!pair) return shell(<p className="muted">{t.common.loading}</p>);

  const [a, b] = pair.pair;
  const direction = pair.supersede_candidate;
  const older = direction.possible ? pair.pair.find((f) => f.uuid === direction.older_uuid) : undefined;

  return shell(
    <>
      {!canEdit && (
        <p className="notice notice--neutral">
          <span aria-hidden="true">🔒</span>
          {t.factDuplicatePanel.readOnlyPrefix} <code>knowledge.edit</code> {t.factDuplicatePanel.readOnlySuffix}
        </p>
      )}

      {pair.resolved ? (
        <p className="notice notice--neutral">
          <span aria-hidden="true">✓</span>
          {t.factDuplicatePanel.resolvedNotice}
        </p>
      ) : (
        <div className="notice">
          <span aria-hidden="true">⚠</span>
          <div className="notice-body">
            {t.factDuplicatePanel.noticeIntro} <strong>{t.factDuplicatePanel.supersedeBold}</strong>{' '}
            {t.factDuplicatePanel.noticeMid1} <strong>{t.factDuplicatePanel.coexistBold}</strong>{' '}
            {t.factDuplicatePanel.noticeMid2}
            <strong> {t.factDuplicatePanel.incorrectBold}</strong>{t.factDuplicatePanel.noticeMid3} <strong>{t.factDuplicatePanel.noDeleteBold}</strong>
            {t.factDuplicatePanel.noticeTail}
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
          <h4>{t.factDuplicatePanel.resolveHeading}</h4>

          {direction.possible ? (
            <>
              <p className="muted">
                {t.factDuplicatePanel.whichIsNewerPrefix}{' '}
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
                      {f.value} <span className="muted">{t.factDuplicatePanel.sincePrefix} {f.validity_start ?? t.common.dash}</span>
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
            <span className="label">{t.factDuplicatePanel.noteLabel}</span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} />
          </label>

          <div className="proposal-actions">
            <button
              className="btn btn-primary"
              disabled={busy || !direction.possible || !newerUuid}
              onClick={() => setConfirming('supersede')}
            >
              {t.factDuplicatePanel.supersedeButton}
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => setConfirming('coexist')}>
              {t.factDuplicatePanel.coexistButton}
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => setConfirming('reject')}>
              {t.factDuplicatePanel.rejectButton}
            </button>
          </div>
        </section>
      )}

      {confirming && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t.factDuplicatePanel.confirmResolutionAriaLabel}>
          <div className="modal">
            <h4 className="modal-title"><span aria-hidden="true">⚠</span> {t.factDuplicatePanel.confirmLabel}</h4>
            <p className="modal-body">
              {confirming === 'supersede' &&
                `${t.factDuplicatePanel.confirmSupersedePrefix} ${
                  direction.possible ? direction.would_close_older_at : t.common.dash
                }${t.factDuplicatePanel.confirmSupersedeSuffix}`}
              {confirming === 'coexist' && t.factDuplicatePanel.confirmCoexistBody}
              {confirming === 'reject' && t.factDuplicatePanel.confirmRejectBody}
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirming(null)} disabled={busy}>{t.common.cancel}</button>
              <button className="btn btn-warning" onClick={() => act(confirming)} disabled={busy}>
                {busy ? t.factDuplicatePanel.applying : t.factDuplicatePanel.confirmLabel}
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
  const t = useT();
  const field = (key: string, label: string, value: string | null) => (
    <div className={`compare-field ${differing.includes(key) ? 'is-differing' : ''}`}>
      <dt>{label}</dt>
      <dd>{value ?? t.common.dash}</dd>
    </div>
  );

  return (
    <div className={`compare-side ${side.source === 'ai_agent' && side.status === 'needs_review' ? 'ai-marked' : ''}`}>
      <div className="proposal-head">
        <strong className="fact-value">{side.value}</strong>
        {isNewer && <span className="badge badge-verified">{t.factDuplicatePanel.newerBadge}</span>}
        {side.status === 'verified' && <span className="badge badge-verified">{t.factDuplicatePanel.verifiedBadge}</span>}
        {side.status === 'needs_review' && <span className="badge badge-review">{t.factDuplicatePanel.unverifiedBadge}</span>}
        {side.status === 'rejected' && <span className="badge badge-review">{t.factDuplicatePanel.rejectedBadge}</span>}
        {side.resolution && <span className="badge badge-historical">{side.resolution}</span>}
      </div>
      <dl style={{ margin: 0 }}>
        {field('group_label', t.factDuplicatePanel.groupAsWrittenLabel, side.group_label)}
        {field('job_category', t.factDuplicatePanel.categoryLabel, side.job_category)}
        {field('topic', t.factDuplicatePanel.topicLabel, side.topic)}
        {field('validity_start', t.factDuplicatePanel.validityStartLabel, side.validity_start)}
        {field('validity_end', t.factDuplicatePanel.validityEndLabel, side.validity_end)}
        {field('convenio', t.common.convenio, side.convenio_name ?? side.convenio)}
      </dl>
      {side.source_excerpt && (
        <>
          <span className="muted">{t.factDuplicatePanel.sourceLineLabel}</span>
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
          {side.resolution} {t.factDuplicatePanel.resolvedByConnector} {side.resolved_by} · {side.resolved_at}
        </p>
      )}
    </div>
  );
}
