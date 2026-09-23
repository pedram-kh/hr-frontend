import { useEffect, useState } from 'react';
import {
  approveVocabularyProposal,
  canApproveVocabulary,
  proposeVocabulary,
  suggestVocabularyVariant,
  type VariantSuggestion,
  type VocabularyFacet,
} from '../../lib/api';
import { useAuth } from '../../auth/context';
import { useT } from '../../i18n/context';

/**
 * The propose-new-vocabulary chooser (Sprint 7a, ADR-0011/0020).
 *
 * Variant→alias is offered FIRST: when the deterministic resolver finds a close
 * existing value (above its threshold), "fold into alias" is pre-selected;
 * "create a new value" is the deliberate fallback when nothing is close. The AI
 * never reaches here — a human always proposes; a super_admin (vocabulary.approve)
 * may propose-and-approve in one action, otherwise it is a two-step proposal.
 *
 * Reused by the document card (from a raw_unmatched_value) and the review queue.
 */
export function ProposeVocabularyForm({
  facet,
  value,
  sourceDocumentUuid,
  reviewTaskId,
  onDone,
}: {
  facet: VocabularyFacet;
  value: string;
  sourceDocumentUuid?: string | null;
  reviewTaskId?: number | null;
  onDone: (msg: string) => void;
}) {
  const t = useT();
  const { identity } = useAuth();
  const canApprove = canApproveVocabulary(identity);
  const [variant, setVariant] = useState<VariantSuggestion | null>(null);
  const [resolution, setResolution] = useState<'alias' | 'new_value'>('new_value');
  const [level, setLevel] = useState<'national' | 'regional' | 'provincial'>('provincial');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    suggestVocabularyVariant(facet, value)
      .then((r) => {
        if (!active) return;
        setVariant(r.variant);
        // Variant→alias is the strong default when something close exists.
        setResolution(r.variant ? 'alias' : 'new_value');
      })
      .catch(() => setVariant(null));
    return () => {
      active = false;
    };
  }, [facet, value]);

  // Convenios are registry-owned: a brand-new convenio is never created here.
  const newValueBlocked = facet === 'convenio' && resolution === 'new_value';

  const run = async (approveNow: boolean) => {
    setBusy(true);
    setError(null);
    try {
      if (approveNow) {
        await proposeVocabulary({
          facet,
          value,
          source_document_uuid: sourceDocumentUuid ?? null,
          review_task_id: reviewTaskId ?? null,
          approve_now: true,
          resolution,
          target_id: resolution === 'alias' ? variant?.id ?? null : null,
          level: resolution === 'new_value' && facet === 'territory' ? level : undefined,
        });
        onDone(
          resolution === 'alias'
            ? `${t.proposeVocabularyForm.foldedMsgPrefix}${value}${t.proposeVocabularyForm.foldedMsgMid} ${variant?.name}${t.proposeVocabularyForm.foldedMsgSuffix}`
            : `${t.proposeVocabularyForm.createdNewMsgPrefix} ${facet} ${t.proposeVocabularyForm.createdNewMsgMid}${value}${t.proposeVocabularyForm.createdNewMsgSuffix}`,
        );
      } else {
        await proposeVocabulary({
          facet,
          value,
          source_document_uuid: sourceDocumentUuid ?? null,
          review_task_id: reviewTaskId ?? null,
        });
        onDone(`${t.proposeVocabularyForm.proposedMsgPrefix}${value}${t.proposeVocabularyForm.proposedMsgSuffix}`);
      }
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="propose-vocab ai-marked">
      <p className="timeline-meta">
        {t.proposeVocabularyForm.proposeForPrefix} <code>{facet}</code>: <strong>{value}</strong>
      </p>

      <div className="propose-vocab-choice">
        <label className={`radio ${variant ? '' : 'is-disabled'}`}>
          <input
            type="radio"
            name={`res-${facet}-${value}`}
            checked={resolution === 'alias'}
            disabled={!variant}
            onChange={() => setResolution('alias')}
          />
          {variant ? (
            <>{t.proposeVocabularyForm.foldIntoPrefix} <strong>{variant.name}</strong> {t.proposeVocabularyForm.foldAsAliasLabel} <span className="muted">{t.proposeVocabularyForm.similarityPrefix} {Math.round(variant.similarity * 100)}{t.proposeVocabularyForm.percentCloseParen}</span></>
          ) : (
            <>{t.proposeVocabularyForm.foldIntoExistingLabel} <span className="muted">{t.proposeVocabularyForm.nothingCloseFoundHint}</span></>
          )}
        </label>
        <label className="radio">
          <input
            type="radio"
            name={`res-${facet}-${value}`}
            checked={resolution === 'new_value'}
            onChange={() => setResolution('new_value')}
          />
          {t.proposeVocabularyForm.createNewPrefix} {facet} <span className="muted">{t.proposeVocabularyForm.deliberateHint}</span>
        </label>
      </div>

      {resolution === 'new_value' && facet === 'territory' && (
        <label className="propose-vocab-level">
          {t.proposeVocabularyForm.levelLabel}
          <select className="select" value={level} onChange={(e) => setLevel(e.target.value as typeof level)}>
            <option value="provincial">provincial</option>
            <option value="regional">regional</option>
            <option value="national">national</option>
          </select>
        </label>
      )}

      {newValueBlocked && (
        <p className="notice">
          <span aria-hidden="true">⚠</span>
          {t.proposeVocabularyForm.convenioBlockedNotice}
        </p>
      )}

      {error && <p className="error">{error}</p>}

      <div className="propose-vocab-actions">
        {canApprove ? (
          <button
            className="btn btn-primary"
            disabled={busy || newValueBlocked || (resolution === 'alias' && !variant)}
            onClick={() => run(true)}
          >
            {resolution === 'alias' ? t.proposeVocabularyForm.approveAsAliasButton : t.proposeVocabularyForm.approveAsNewValueButton}
          </button>
        ) : (
          <button className="btn btn-secondary" disabled={busy} onClick={() => run(false)}>
            {t.proposeVocabularyForm.proposeOnlyButton}
          </button>
        )}
      </div>
    </div>
  );
}

/** A compact approve/reject control for an existing proposal (review queue). */
export function ApproveProposalControls({
  proposalId,
  facet,
  variantId,
  hasVariant,
  onDone,
}: {
  proposalId: number;
  facet: VocabularyFacet;
  variantId: number | null;
  hasVariant: boolean;
  onDone: (msg: string) => void;
}) {
  const t = useT();
  const [level, setLevel] = useState<'national' | 'regional' | 'provincial'>('provincial');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async (resolution: 'alias' | 'new_value') => {
    setBusy(true);
    setError(null);
    try {
      await approveVocabularyProposal(proposalId, {
        resolution,
        target_id: resolution === 'alias' ? variantId : null,
        level: resolution === 'new_value' && facet === 'territory' ? level : undefined,
      });
      onDone(resolution === 'alias' ? t.proposeVocabularyForm.foldedExistingMsg : t.proposeVocabularyForm.createdNewValueMsg);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="propose-vocab-actions">
      <button className="btn btn-primary" disabled={busy || !hasVariant || facet === 'topic'} onClick={() => approve('alias')}>
        {t.proposeVocabularyForm.approveAsAliasButton}
      </button>
      {facet === 'territory' && (
        <select className="select" value={level} onChange={(e) => setLevel(e.target.value as typeof level)}>
          <option value="provincial">provincial</option>
          <option value="regional">regional</option>
          <option value="national">national</option>
        </select>
      )}
      <button className="btn btn-secondary" disabled={busy || facet === 'convenio'} onClick={() => approve('new_value')}>
        {t.proposeVocabularyForm.approveAsNewValueButton}
      </button>
      {facet === 'topic' && (
        <p className="notice">
          <span aria-hidden="true">⚠</span> {t.proposeVocabularyForm.topicNoAliasNotice}
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
