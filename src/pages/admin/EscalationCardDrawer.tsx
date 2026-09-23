import { useEffect, useRef, useState } from 'react';
import {
  ApiError,
  getVocabulary,
  replyEscalation,
  resolveEscalation,
  updateEscalation,
  type ConversationMessage,
  type EscalationCardSummary,
  type EscalationDetail,
  type EscalationStatus,
  type SemanticPassage,
  type VocabularyItem,
} from '../../lib/api';
import { useAuth } from '../../auth/context';
import { CitationList } from '../chat/CitationList';
import { TracePanel } from '../chat/TracePanel';
import { useT } from '../../i18n/context';

// Legal status transitions (mirrors EscalationService::TRANSITIONS — the server
// validates; this only shapes the picker so an illegal move isn't offered).
const TRANSITIONS: Record<EscalationStatus, EscalationStatus[]> = {
  new: ['assigned', 'in_progress', 'closed'],
  assigned: ['in_progress', 'new', 'closed'],
  in_progress: ['resolved', 'assigned', 'closed'],
  resolved: ['closed', 'in_progress'],
  closed: ['in_progress'],
};

// The card-scoped detail drawer: the conversation + trace for THIS card only
// (not a history browser), plus assign/move/reply/resolve for escalation.work
// holders. Reuses the Sprint-2/3 chat components (CitationList, TracePanel).
export function CardDrawer({
  uuid,
  canWork,
  onClose,
  onChanged,
  fetchDetail,
}: {
  uuid: string;
  canWork: boolean;
  onClose: () => void;
  onChanged: () => void;
  fetchDetail: (uuid: string) => Promise<EscalationDetail>;
}) {
  const { identity } = useAuth();
  const t = useT();
  const statusLabels: Record<EscalationStatus, string> = t.escalationCard.statusLabels;
  const [detail, setDetail] = useState<EscalationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Stable ref so the ESC handler never captures a stale onClose.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const load = () => {
    fetchDetail(uuid)
      .then(setDetail)
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));
  };

  useEffect(load, [uuid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const reload = () => {
    load();
    onChanged();
  };

  if (error)
    return (
      <div className="detail-backdrop" onClick={onClose}>
        <aside className="detail panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="detail-head">
            <strong>{t.escalationCard.error}</strong>
            <button className="btn btn-ghost" onClick={onClose} aria-label={t.escalationCard.close}>✕</button>
          </div>
          <div className="detail-body"><p className="error">{error}</p></div>
        </aside>
      </div>
    );
  if (!detail)
    return (
      <div className="detail-backdrop" onClick={onClose}>
        <aside className="detail panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="detail-head">
            <strong>{t.escalationCard.loading}</strong>
            <button className="btn btn-ghost" onClick={onClose} aria-label={t.escalationCard.close}>✕</button>
          </div>
          <div className="detail-body"><p className="muted">{t.escalationCard.loading}</p></div>
        </aside>
      </div>
    );

  const card = detail.card;
  const isResolved = card.status === 'resolved' || card.status === 'closed';
  const mineId = identity?.id;
  const assignedToMe = card.assigned_to?.id === mineId;

  const moveStatus = async (status: EscalationStatus) => {
    setBusy(true);
    try {
      await updateEscalation(uuid, { status });
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const setAssignee = async (assigned_to: number | null) => {
    setBusy(true);
    try {
      await updateEscalation(uuid, { assigned_to });
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="detail-backdrop" onClick={onClose}>
    <aside className="detail panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${t.escalationCard.cardHeadingPrefix} ${card.reason_label}`}>
      <div className="detail-head">
        <strong>{t.escalationCard.cardHeadingPrefix} {card.reason_label}</strong>
        <button className="btn btn-ghost" onClick={onClose} aria-label={t.escalationCard.close}>✕</button>
      </div>
      <div className="detail-body">

      {!canWork && (
        <p className="notice notice--neutral">
          <span aria-hidden="true">🔒</span>
          {t.escalationCard.readOnlyNotice}
        </p>
      )}

      <section>
        <div className="card-trigger">
          <span className="badge badge-review">{card.reason_label}</span>
          <p className="card-trigger-q">{card.question ?? t.escalationCard.noOriginQuestion}</p>
          {card.created_at && <p className="timeline-meta">{t.escalationCard.escalatedOnPrefix} {card.created_at}</p>}
        </div>
        <dl className="kv">
          <dt>{t.escalationCard.colStatus}</dt><dd>{statusLabels[card.status]}</dd>
          <dt>{t.escalationCard.colEmployee}</dt><dd>{card.employee?.full_name ?? t.common.dash}</dd>
          <dt>{t.escalationCard.colConvenio}</dt><dd>{card.employee?.convenio ? `${card.employee.convenio.numero} — ${card.employee.convenio.name}` : t.common.dash}</dd>
          <dt>{t.escalationCard.colAssignedTo}</dt><dd>{card.assigned_to?.full_name ?? t.escalationCard.unassigned}</dd>
          {card.topic && (<><dt>{t.escalationCard.colTopic}</dt><dd>{card.topic.name}</dd></>)}
        </dl>
      </section>

      <EmployeeContextBlock detail={detail} />

      <ExplanationBlock card={card} />

      {canWork && (
        <section>
          <h4>{t.escalationCard.triageHeading}</h4>
          <div className="reassign">
            {!assignedToMe ? (
              <button className="btn btn-secondary" onClick={() => setAssignee(mineId ?? null)} disabled={busy || !mineId}>
                {t.escalationCard.assignToMe}
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={() => setAssignee(null)} disabled={busy}>
                {t.escalationCard.unassignButton}
              </button>
            )}
            <select
              className="select"
              value=""
              onChange={(e) => e.target.value && moveStatus(e.target.value as EscalationStatus)}
              disabled={busy}
              aria-label={t.escalationCard.moveStatusAriaLabel}
            >
              <option value="">{t.escalationCard.moveToPlaceholder}</option>
              {(TRANSITIONS[card.status] ?? []).map((s) => (
                <option key={s} value={s}>{statusLabels[s]}</option>
              ))}
            </select>
          </div>
        </section>
      )}

      <section>
        <h4>{t.escalationCard.conversationHeading}</h4>
        {detail.conversation_restricted ? (
          // Sprint-5 tightening (ADR-0018 §4.4): a knowledge_editor sees the card
          // meta but NOT the conversation content (gated server-side; the payload
          // arrives empty). The hr_agent boundary is unchanged.
          <p className="notice notice--neutral">
            <span aria-hidden="true">🔒</span>
            {t.escalationCard.conversationRestrictedNotice}{' '}
            <code>escalation.work</code> {t.escalationCard.conversationRestrictedOr} <code>history.view_all</code>.
          </p>
        ) : (
          <>
            <p className="timeline-meta">
              {t.escalationCard.conversationIntro}
              <em> {t.escalationCard.conversationIntroThis}</em> {t.escalationCard.conversationIntroSuffix}
            </p>
            <div className="card-convo">
              {detail.conversation.map((m) => <ConversationBubble key={m.id} message={m} />)}
            </div>
          </>
        )}
      </section>

      {canWork && <ReplyBox uuid={uuid} disabled={busy} onSent={reload} />}

      {canWork && !isResolved && <SaveAsKnowledge uuid={uuid} onResolved={reload} />}

      <EventsLog events={detail.events} />
      </div>
    </aside>
    </div>
  );
}

// Sprint 7g Item 1 (ADR-0029) — the "Resumen IA" block: HR's explanation of
// WHY this escalated, without the employee ever seeing any of it (the
// employee's turn in "Conversación" above always shows the one fixed
// neutral message, regardless of this card's reason). Structure:
//
//   1. The AI paragraph (labelled "Resumen IA"), when it survived the
//      no-new-claims check — else the deterministic facts rendered as
//      plain sentences (`factsToSentences`, mirroring
//      `EscalationExplainer::factsToSentences()` server-side EXACTLY, so
//      the fallback text is never surprising to someone who has seen the
//      AI version elsewhere).
//   2. "Corregir" — the fix action, ALWAYS structured (never the model's),
//      linking straight to the surface that can actually fix the gap (the
//      Sprint 7g Item 2 hash-routing scheme; `#view=review&tab=groups...`,
//      `#view=directory&emp=...`, etc.). Some reasons have no fix surface
//      (e.g. a guardrail-baseline privacy case) — `fix_link` is null and no
//      button is shown, only the fix_action text.
function ExplanationBlock({ card }: { card: EscalationCardSummary }) {
  const t = useT();
  const facts = card.explanation_facts;
  if (!facts) {
    // Pre-7g card that hasn't been backfilled yet (escalations:backfill-
    // explanations), or a card whose explanation write somehow never landed.
    return (
      <section>
        <h4>{t.escalationCard.explanationHeading}</h4>
        <p className="muted">{t.escalationCard.noStructuredExplanation}</p>
      </section>
    );
  }

  const paragraph = card.explanation_text ?? factsToSentences(facts, t);
  const isAi = card.explanation_text !== null && card.explanation_text !== '';

  return (
    <section>
      <h4>{t.escalationCard.explanationHeading}</h4>
      <div className="notice notice--ai">
        {isAi && <span className="ai-pill" title={t.escalationCard.aiSummaryBadgeTitle}>{t.escalationCard.aiSummaryBadge}</span>}
        <p className={isAi ? 'answer-prose' : 'answer-prose muted'} style={{ margin: isAi ? undefined : '0' }}>{paragraph}</p>
      </div>
      {card.fix_link ? (
        <a className="btn btn-secondary" href={card.fix_link}>
          {t.escalationCard.fixLinkLabel}{card.fix_surface ? ` · ${card.fix_surface}` : ''}
        </a>
      ) : card.fix_action ? (
        <p className="timeline-meta">{card.fix_action}</p>
      ) : null}
    </section>
  );
}

// Correction-02 (CP-4 step 6, C2-2) — the card-detail-ONLY employee block
// (name/email/territory/category-group/seniority). Detail modal only, by
// construction: `EscalationEmployeeContext` lives on `EscalationDetail`
// (`show()`'s response), never on `EscalationCardSummary` (shared by both the
// board's list AND the detail header above) — so the board's list-view cards
// are untouched. Gated server-side by the same `escalation.work` ability the
// Triaje actions already require; a history.view_all-only viewer sees the
// same restricted-access notice pattern already used for the conversation
// below, rather than a new UI idiom.
function EmployeeContextBlock({ detail }: { detail: EscalationDetail }) {
  const t = useT();
  if (detail.employee_context_restricted) {
    return (
      <section>
        <h4>{t.escalationCard.employeeHeading}</h4>
        <p className="notice notice--neutral">
          <span aria-hidden="true">🔒</span>
          {t.escalationCard.employeeContextRestrictedNotice} <code>escalation.work</code>.
        </p>
      </section>
    );
  }

  const ctx = detail.employee_context;
  if (!ctx) return null;

  return (
    <section>
      <h4>{t.escalationCard.employeeHeading}</h4>
      <dl className="kv">
        <dt>{t.escalationCard.colName}</dt><dd>{ctx.full_name}</dd>
        <dt>{t.escalationCard.colEmail}</dt><dd>{ctx.email}</dd>
        <dt>{t.escalationCard.colTerritory}</dt><dd>{ctx.territory?.name ?? t.common.dash}</dd>
        <dt>{t.escalationCard.colCategoryGroup}</dt>
        <dd>
          {ctx.job_category?.name ?? t.common.dash}
          {ctx.convenio_group && <span className="muted"> · {ctx.convenio_group.path_label}</span>}
        </dd>
        <dt>{t.escalationCard.colSeniority}</dt>
        <dd>
          {ctx.seniority
            ? `${ctx.seniority.years} ${t.escalationCard.seniorityYearsSuffix} ${ctx.seniority.start_date})`
            : <span className="muted">{t.escalationCard.notRegistered}</span>}
        </dd>
      </dl>
    </section>
  );
}

// Mirrors `EscalationExplainer::factsToSentences()` (hr-backend) EXACTLY —
// the deterministic fallback shown when there is no AI paragraph (provider
// failure, no-new-claims rejection, or not yet processed). States nothing the
// structured facts don't already say.
function factsToSentences(facts: NonNullable<EscalationCardSummary['explanation_facts']>, t: ReturnType<typeof useT>): string {
  return `${facts.asked} ${facts.found} ${facts.stopped_reason} ${t.escalationCard.suggestedActionPrefix} ${facts.fix_action}.`.trim();
}

// One conversation turn. A bot answer reuses the citation list + trace; a human
// (hr_agent) reply is a clearly-attributed distinct bubble — never mistakable
// for the bot. A user turn is the employee's question.
function ConversationBubble({ message }: { message: ConversationMessage }) {
  const t = useT();
  if (message.role === 'user') {
    return (
      <div className="chat-row chat-row--user">
        <div className="chat-bubble chat-bubble--user">{message.content}</div>
      </div>
    );
  }

  if (message.role === 'hr_agent') {
    return (
      <div className="chat-row chat-row--assistant">
        <div className="card chat-bubble chat-bubble--assistant chat-bubble--agent">
          <span className="badge badge-agent">
            {t.escalationCard.hrReplyBadgePrefix} {message.author_label ?? t.escalationCard.hrAgentDefaultLabel} {t.escalationCard.hrReplyBadgeSuffix}
          </span>
          <p className="answer-prose">{message.content}</p>
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div className="chat-row chat-row--assistant">
      <div className={`card chat-bubble chat-bubble--assistant ${message.escalated ? 'escalation' : ''}`}>
        {message.escalated && <span className="badge badge-review">{t.escalationCard.escalatedToHrBadge}</span>}
        <p className="answer-prose">{message.content}</p>
        <CitationList citations={message.citations} />
        {message.trace && <TracePanel trace={message.trace} />}
      </div>
    </div>
  );
}

function ReplyBox({ uuid, disabled, onSent }: { uuid: string; disabled: boolean; onSent: () => void }) {
  const t = useT();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await replyEscalation(uuid, text.trim());
      setText('');
      onSent();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h4>{t.escalationCard.replyHeading}</h4>
      <p className="timeline-meta">{t.escalationCard.replyIntro}</p>
      <textarea
        className="textarea"
        rows={3}
        placeholder={t.escalationCard.replyPlaceholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy || disabled}
      />
      {err && <p className="error">{err}</p>}
      <button className="btn btn-primary" onClick={send} disabled={busy || disabled || !text.trim()}>
        {busy ? t.escalationCard.sending : t.escalationCard.sendReply}
      </button>
    </section>
  );
}

// One overlapping convenio passage, as both fence bands return it. The passage is
// the evidence; the score is context. Shown identically in the blocked and the
// acknowledge case so a human learns to read the same thing in both.
function OverlapPassages({ passages }: { passages: SemanticPassage[] }) {
  const t = useT();
  if (passages.length === 0) return null;
  return (
    <ul className="passage-list">
      {passages.map((p, i) => (
        <li key={p.chunk_id ?? i}>
          <div className="passage-head">
            <strong>{p.document_title ?? t.escalationCard.officialConvenioFallback}</strong>
            {p.page_from !== null && <span className="muted"> · {t.escalationCard.pagePrefix} {p.page_from}</span>}
            <span className="badge badge-historical" title={t.escalationCard.similarityTitle}>
              {p.score.toFixed(3)}
            </span>
          </div>
          <blockquote className="well passage-text">{p.excerpt}</blockquote>
          {p.probe_excerpt && (
            <p className="muted">
              {t.escalationCard.yourTextCompared} <em>{p.probe_excerpt}</em>
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

// Resolve → Save as knowledge. Resolve-only marks the card resolved; "Save as
// knowledge" additionally publishes an internal_hr_ruling (requires a topic +
// scope confirmation). The no-override fence may block the publish (409).
//
// Sprint 7d (ADR-0024): the fence now has three publish-time outcomes, and they
// are NOT interchangeable in the UI either:
//   · publish_blocked — refused. No button makes it publish. The overlapping
//     convenio passage is shown so the refusal is legible, not just asserted.
//   · publish_requires_acknowledgement — asked. The near-passages are shown and
//     the human must tick an explicit acknowledgement, which is sent once with the
//     next attempt and never remembered.
//   · a comparison that could not be made resolves to the SAME acknowledgement
//     prompt, worded to say so — never a clean publish.
function SaveAsKnowledge({ uuid, onResolved }: { uuid: string; onResolved: () => void }) {
  const t = useT();
  const [text, setText] = useState('');
  const [convert, setConvert] = useState(false);
  const [topics, setTopics] = useState<VocabularyItem[]>([]);
  const [topicId, setTopicId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{
    message: string;
    conflicts: { uuid: string; title: string }[];
    reason: string | null;
    passages: SemanticPassage[];
  } | null>(null);
  // The review band. `acknowledged` is per-attempt state that is deliberately
  // reset on every new prompt: it is a decision about the passages just read, so
  // it must never carry over to a different draft or a different comparison.
  const [ack, setAck] = useState<{
    message: string;
    reason: string | null;
    passages: SemanticPassage[];
    comparisonUnavailable: boolean;
  } | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [published, setPublished] = useState<string | null>(null);

  useEffect(() => {
    getVocabulary('topics').then((r) => setTopics(r.items)).catch(() => setTopics([]));
  }, []);

  const doResolve = async (confirmScope: boolean, acknowledgeOverlap = false) => {
    setBusy(true);
    setErr(null);
    setConflict(null);
    try {
      const res = await resolveEscalation(uuid, {
        resolution_text: text.trim(),
        convert,
        topic_id: convert && topicId ? Number(topicId) : null,
        confirm_scope_change: confirmScope,
        acknowledge_semantic_overlap: acknowledgeOverlap,
      });
      setAck(null);
      setAcknowledged(false);
      setConfirming(false);
      if (res.publish) {
        setPublished(
          res.publish.round_trip.lossless
            ? `${t.escalationCard.publishedLosslessPrefix} ${res.publish.chunks_written} ${t.escalationCard.publishedLosslessSuffix}`
            : t.escalationCard.publishedMismatch,
        );
      }
      onResolved();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.body?.code === 'publish_blocked') {
        setConfirming(false);
        setAck(null);
        setAcknowledged(false);
        setConflict({
          message: String(e.body.message ?? ''),
          conflicts: (e.body.conflicts as { uuid: string; title: string }[]) ?? [],
          reason: (e.body.reason as string | null) ?? null,
          passages: (e.body.passages as SemanticPassage[]) ?? [],
        });
      } else if (
        e instanceof ApiError &&
        e.status === 409 &&
        e.body?.code === 'publish_requires_acknowledgement'
      ) {
        // Nothing was published and the draft is untouched. The human reads the
        // near-passages and answers the question; the tick starts unchecked every
        // time, so an acknowledgement is always a fresh decision.
        setConfirming(false);
        setAcknowledged(false);
        setAck({
          message: String(e.body.message ?? ''),
          reason: (e.body.reason as string | null) ?? null,
          passages: (e.body.passages as SemanticPassage[]) ?? [],
          comparisonUnavailable: Boolean(e.body.comparison_unavailable),
        });
      } else {
        setErr(e instanceof ApiError ? e.message : String(e));
        setConfirming(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = () => {
    if (!text.trim()) return;
    if (convert) {
      setConfirming(true); // scope-confirm gate before any publish
    } else {
      doResolve(false);
    }
  };

  return (
    <section className="edit-block">
      <h4>{t.escalationCard.resolveHeading}</h4>
      <textarea
        className="textarea"
        rows={4}
        placeholder={t.escalationCard.resolutionPlaceholder}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          // An acknowledgement is about the text that was compared. Editing the
          // draft invalidates both the comparison and the human's answer to it.
          if (ack) {
            setAck(null);
            setAcknowledged(false);
          }
        }}
        disabled={busy}
      />

      <label className="board-filter-check" style={{ marginTop: 'var(--space-2)' }}>
        <input type="checkbox" checked={convert} onChange={(e) => setConvert(e.target.checked)} disabled={busy} />
        {t.escalationCard.publishAsKnowledge}
      </label>

      {convert && (
        <div className="reassign" style={{ marginTop: 'var(--space-2)' }}>
          <select className="select" value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={busy}>
            <option value="">{t.escalationCard.topicPlaceholder}</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>{topic.name}</option>
            ))}
          </select>
        </div>
      )}
      {convert && !topicId && (
        <p className="notice">
          <span aria-hidden="true">⚠</span>
          {t.escalationCard.noTopicScopeWarning}
        </p>
      )}

      {err && <p className="error">{err}</p>}
      {published && <p className="notice notice--neutral">{published}</p>}

      {conflict && (
        <div className="notice">
          <span aria-hidden="true">⛔</span>
          <div className="notice-body">
            {conflict.message}
            {conflict.conflicts.length > 0 && (
              <ul>
                {conflict.conflicts.map((c) => (<li key={c.uuid}>{c.title}</li>))}
              </ul>
            )}
            {/* Sprint 7d: a semantic block shows WHICH passage already says it. There
                is no acknowledgement offered here — this outcome cannot be clicked
                through, by design. */}
            {conflict.reason === 'semantic_overlap' && <OverlapPassages passages={conflict.passages} />}
          </div>
        </div>
      )}

      {ack && (
        <div className="notice">
          <span aria-hidden="true">{ack.comparisonUnavailable ? '❓' : '⚠'}</span>
          <div className="notice-body">
            {ack.message}
            <OverlapPassages passages={ack.passages} />
            <label className="board-filter-check">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                disabled={busy}
              />
              {ack.comparisonUnavailable
                ? t.escalationCard.acknowledgeComparisonUnavailable
                : t.escalationCard.acknowledgeReadPassages}
            </label>
            <button
              className="btn btn-warning"
              onClick={() => doResolve(true, true)}
              disabled={busy || !acknowledged}
            >
              {busy ? t.escalationCard.publishing : t.escalationCard.publishWithConfirmation}
            </button>
          </div>
        </div>
      )}

      <button className={`btn ${convert ? 'btn-warning' : 'btn-primary'}`} onClick={onSubmit} disabled={busy || !text.trim()}>
        {convert ? t.escalationCard.publishAsKnowledgeButton : t.escalationCard.markResolved}
      </button>

      {confirming && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t.escalationCard.confirmScopeAriaLabel}>
          <div className="modal">
            <h4 className="modal-title"><span aria-hidden="true">⚠</span> {t.escalationCard.confirmScopeTitle}</h4>
            <p className="modal-body">
              {t.escalationCard.confirmScopeBody}
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>{t.common.cancel}</button>
              <button className="btn btn-warning" onClick={() => doResolve(true)} disabled={busy}>{t.escalationCard.confirmAndPublish}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function EventsLog({ events }: { events: EscalationDetail['events'] }) {
  const t = useT();
  if (events.length === 0) return null;
  return (
    <section>
      <h4>{t.escalationCard.activityHeading}</h4>
      <ol className="timeline">
        {events.map((e, i) => (
          <li key={i} className="timeline-item">
            <span className={`timeline-dot src-${e.type === 'publish_blocked' ? 'system' : 'admin_manual'}`} aria-hidden="true" />
            <div>
              <div className="timeline-action">
                {e.type.replace(/_/g, ' ')}
                {e.old_value || e.new_value ? <span className="timeline-value"> {e.old_value ?? t.common.dash} → {e.new_value ?? t.common.dash}</span> : null}
              </div>
              {e.note && <div className="timeline-meta">{e.note}</div>}
              <div className="timeline-meta">{e.created_at}{e.actor ? ` · ${e.actor}` : ''}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
