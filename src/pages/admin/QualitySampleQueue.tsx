import { useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  canWorkEscalations,
  getQualitySample,
  getQualityTrend,
  listQualitySamples,
  reviewQualitySample,
  type QualityFailureKind,
  type QualitySampleDetail,
  type QualitySampleRow,
  type QualityTrendRow,
  type QualityVerdict,
} from '../../lib/api';
import { useAuth } from '../../auth/context';
import { usePaginatedQuery } from '../../lib/usePaginatedQuery';
import { Pager } from './Pager';
import { CitationList } from '../chat/CitationList';
import { TracePanel } from '../chat/TracePanel';
import { BarChart } from './charts';
import { useT } from '../../i18n/context';

interface MonthTotals {
  correct: number;
  partially: number;
  wrong: number;
}

/**
 * §6.5's per-month summary — sums the trend endpoint's (month, verdict,
 * stratum) rows down to (month, verdict), the same aggregation
 * `Sprint8QualitySampleStratificationTest::
 * test_monthly_trend_sums_to_the_real_verdict_counts` proves the backend's
 * raw rows are correct for.
 */
function aggregateByMonth(trend: QualityTrendRow[]): Record<string, MonthTotals> {
  const out: Record<string, MonthTotals> = {};
  for (const row of trend) {
    if (!row.verdict) continue; // unreviewed rows aren't a verdict count.
    const bucket = out[row.month] ?? (out[row.month] = { correct: 0, partially: 0, wrong: 0 });
    bucket[row.verdict] += row.count;
  }
  return out;
}

function accuracyPct(t: MonthTotals): number | null {
  const total = t.correct + t.partially + t.wrong;
  return total === 0 ? null : Math.round((t.correct / total) * 1000) / 10;
}

// Sprint 8 eyes-on round 2 (2026-09-11, plan.md §6.5/§10) — the monthly
// summary line(s) + the shared `.chart-bars` trend chart, found MISSING on
// staging even though §10 explicitly names "quality-verdict trend §6.5" as
// one of the `BarChart`/`LineChart` primitive's intended call sites.
function QualityMonthlySummary({ trend }: { trend: QualityTrendRow[] }) {
  const t = useT();
  const byMonth = useMemo(() => aggregateByMonth(trend), [trend]);
  const months = useMemo(() => Object.keys(byMonth).sort().reverse(), [byMonth]);

  if (months.length === 0) {
    return <p className="muted">{t.qualitySampleQueue.noVerdictsYet}</p>;
  }

  const latest = byMonth[months[0]];

  return (
    <div className="quality-monthly-summary">
      {months.map((m) => {
        const totals = byMonth[m];
        const acc = accuracyPct(totals);
        return (
          <p key={m} className="timeline-meta">
            <strong>{m}</strong> — {totals.correct} {t.qualitySampleQueue.monthlyCorrectSuffix} · {totals.partially} {t.qualitySampleQueue.monthlyPartiallySuffix} · {totals.wrong} {t.qualitySampleQueue.monthlyWrongSuffix}
            {acc !== null && <> · <strong>{acc}%</strong> {t.qualitySampleQueue.accuracySuffix}</>}
          </p>
        );
      })}
      <BarChart
        data={[
          { label: t.qualitySampleQueue.chartLabelCorrect, value: latest.correct },
          { label: t.qualitySampleQueue.chartLabelPartially, value: latest.partially },
          { label: t.qualitySampleQueue.chartLabelWrong, value: latest.wrong },
        ]}
      />
    </div>
  );
}

// Sprint 8, Step 7 (plan.md §6.3/§6.5, ADR-0030) — the Calidad screen.
// Promoted from a nested ReviewQueuePage tab to its own top-level AdminShell
// view (found live, eyes-on 2026-09-10 — see `AdminShell.tsx`/`canViewQuality`).
// READS are open to any admin (`Sprint8AnalyticsAccessTest::
// test_quality_sample_reads_are_open_to_any_admin` — no view ability
// exists or should exist, ADR-0030 §5); the one review-write action is
// gated by `escalation.work` (server-enforced; this page only hides the
// affordance).
export function QualitySampleQueue() {
  const t = useT();
  const { identity } = useAuth();
  const canReview = canWorkEscalations(identity);

  const [month, setMonth] = useState('');
  const [unreviewedOnly, setUnreviewedOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [trend, setTrend] = useState<QualityTrendRow[]>([]);

  const loadTrend = () => {
    getQualityTrend()
      .then((r) => setTrend(r.trend))
      .catch(() => {
        /* the summary is a supplement to the table, not load-bearing — a
           failed fetch here shouldn't block the queue from rendering. */
      });
  };
  useEffect(loadTrend, []);

  const { rows, loading, error, meta, setPage, refresh } = usePaginatedQuery<QualitySampleRow>(
    (page) => {
      const params: Record<string, string> = { page: String(page) };
      if (month) params.month = month;
      if (unreviewedOnly) params.unreviewed = 'true';
      return listQualitySamples(params).then((r) => r.samples);
    },
    `${month}|${unreviewedOnly}`,
  );

  return (
    <>
      <p className="muted">
        {t.qualitySampleQueue.introPart1} <strong>{t.qualitySampleQueue.verdictLabels.wrong}</strong> {t.qualitySampleQueue.introPart2}
        <code>quality_sample_wrong</code>{t.qualitySampleQueue.introPart3}
        {' '}
        <span className="muted docs-total">{meta.total} {t.qualitySampleQueue.sampleWord}{meta.total === 1 ? '' : 's'}</span>
      </p>
      <QualityMonthlySummary trend={trend} />
      <div className="reassign">
        <input
          className="input"
          type="text"
          placeholder={t.qualitySampleQueue.monthPlaceholder}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ maxWidth: 140 }}
        />
        <label className="checkbox">
          <input type="checkbox" checked={unreviewedOnly} onChange={(e) => setUnreviewedOnly(e.target.checked)} />
          {t.qualitySampleQueue.unreviewedOnlyLabel}
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">{t.qualitySampleQueue.loadingText}</p>
      ) : (
        <table className="docs-table">
          <thead>
            <tr>
              <th>{t.qualitySampleQueue.colMonth}</th><th>{t.qualitySampleQueue.colQuestion}</th><th>{t.qualitySampleQueue.colStratum}</th><th>{t.qualitySampleQueue.colTerritory}</th><th>{t.qualitySampleQueue.colVerdict}</th><th>{t.qualitySampleQueue.colReviewer}</th><th>{t.qualitySampleQueue.colCard}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.uuid} className={selected === r.uuid ? 'is-selected' : ''} onClick={() => setSelected(r.uuid)}>
                <td className="muted">{r.sampled_for_month}</td>
                <td className="cell-clip">
                  {r.question ?? t.common.dash}
                  {r.message?.content && (
                    <details onClick={(e) => e.stopPropagation()}>
                      <summary className="muted small">{t.qualitySampleQueue.viewAnswerSummary}</summary>
                      <p className="answer-prose">{r.message.content}</p>
                    </details>
                  )}
                </td>
                <td className="muted small">{r.stratum_path ?? t.qualitySampleQueue.stratumPathFallback}</td>
                <td className="muted small">{r.stratum_territory?.name ?? t.qualitySampleQueue.nationalFallback}</td>
                <td>
                  {r.verdict ? (
                    <span className={`badge ${r.verdict === 'wrong' ? 'badge-conflict' : r.verdict === 'partially' ? 'badge-review' : 'badge-verified'}`}>
                      {t.qualitySampleQueue.verdictLabels[r.verdict]}
                    </span>
                  ) : (
                    <span className="badge badge-review">{t.qualitySampleQueue.notReviewedBadge}</span>
                  )}
                </td>
                <td className="muted small">{r.reviewer?.full_name ?? t.common.dash}</td>
                <td className="muted small">{r.escalation_card ? `#${r.escalation_card.id}` : t.common.dash}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="col-empty">{t.qualitySampleQueue.noSamplesPrefix} <code>php artisan quality:sample</code> {t.qualitySampleQueue.noSamplesSuffix}</td></tr>
            )}
          </tbody>
        </table>
      )}
      <Pager meta={meta} setPage={setPage} />
      {selected && (
        <QualitySampleDrawer
          uuid={selected}
          canReview={canReview}
          onClose={() => setSelected(null)}
          onChanged={() => {
            refresh();
            loadTrend();
          }}
        />
      )}
    </>
  );
}

function QualitySampleDrawer({
  uuid,
  canReview,
  onClose,
  onChanged,
}: {
  uuid: string;
  canReview: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const t = useT();
  const [detail, setDetail] = useState<QualitySampleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<QualityVerdict | ''>('');
  const [failureKind, setFailureKind] = useState<QualityFailureKind | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    getQualitySample(uuid)
      .then((d) => {
        setDetail(d);
        setVerdict(d.sample.verdict ?? '');
        setFailureKind(d.sample.failure_kind ?? '');
        setNote(d.sample.note ?? '');
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));
  };
  useEffect(load, [uuid]);

  const submit = async () => {
    if (!verdict) return;
    if (verdict !== 'correct' && !failureKind) {
      setError(t.qualitySampleQueue.selectFailureReasonError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await reviewQualitySample(uuid, {
        verdict,
        failure_kind: verdict === 'correct' ? null : (failureKind as QualityFailureKind),
        note: note || null,
      });
      load();
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (error && !detail) {
    return (
      <div className="detail-backdrop" onClick={onClose}>
        <aside className="detail panel" onClick={(e) => e.stopPropagation()}>
          <div className="detail-head"><strong>{t.qualitySampleQueue.drawerHeading}</strong><button className="btn btn-ghost" onClick={onClose}>✕</button></div>
          <div className="detail-body"><p className="error">{error}</p></div>
        </aside>
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="detail-backdrop" onClick={onClose}>
        <aside className="detail panel" onClick={(e) => e.stopPropagation()}>
          <div className="detail-head"><strong>{t.qualitySampleQueue.drawerHeading}</strong><button className="btn btn-ghost" onClick={onClose}>✕</button></div>
          <div className="detail-body"><p className="muted">{t.qualitySampleQueue.loadingText}</p></div>
        </aside>
      </div>
    );
  }

  const { sample, conversation, reviewer_barred: reviewerBarred } = detail;

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <aside className="detail panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="detail-head">
          <strong>{t.qualitySampleQueue.drawerHeading} · {sample.sampled_for_month}</strong>
          <button className="btn btn-ghost" onClick={onClose} aria-label={t.common.close}>✕</button>
        </div>
        <div className="detail-body">
          <dl className="kv">
            <dt>{t.qualitySampleQueue.colStratum}</dt><dd>{sample.stratum_path ?? t.qualitySampleQueue.stratumPathFallback} · {sample.stratum_territory?.name ?? t.qualitySampleQueue.nationalFallback}</dd>
            <dt>{t.qualitySampleQueue.colSeed}</dt><dd>{sample.seed}</dd>
            {sample.escalation_card && (<><dt>{t.qualitySampleQueue.colCorrectionCard}</dt><dd>#{sample.escalation_card.id}</dd></>)}
          </dl>

          <section>
            <h4>{t.escalationCard.conversationHeading}</h4>
            <div className="card-convo">
              {conversation.map((m) => (
                <div key={m.id} className={`chat-row ${m.role === 'user' ? 'chat-row--user' : 'chat-row--assistant'}`}>
                  {m.role === 'user' ? (
                    <div className="chat-bubble chat-bubble--user">{m.content}</div>
                  ) : m.role === 'hr_agent' ? (
                    <div className="card chat-bubble chat-bubble--assistant chat-bubble--agent">
                      <span className="badge badge-agent">
                        {t.escalationCard.hrReplyBadgePrefix} {m.author_label ?? t.escalationCard.hrAgentDefaultLabel} {t.escalationCard.hrReplyBadgeSuffix}
                      </span>
                      <p className="answer-prose">{m.content}</p>
                    </div>
                  ) : (
                    <div className={`card chat-bubble chat-bubble--assistant ${m.escalated ? 'escalation' : ''}`}>
                      {m.escalated && <span className="badge badge-review">{t.escalationCard.escalatedToHrBadge}</span>}
                      <p className="answer-prose">{m.content}</p>
                      <CitationList citations={m.citations} />
                      {m.trace && <TracePanel trace={m.trace} />}
                    </div>
                  )}
                </div>
              ))}
              {conversation.length === 0 && <p className="muted">{t.qualitySampleQueue.noConversationAssociated}</p>}
            </div>
          </section>

          <section className="edit-block">
            <h4>{t.qualitySampleQueue.reviewHeading}</h4>
            {!canReview && (
              <p className="notice notice--neutral">
                <span aria-hidden="true">🔒</span>
                {t.qualitySampleQueue.readOnlyReviewNoticePrefix} <code>escalation.work</code> {t.qualitySampleQueue.readOnlyReviewNoticeSuffix}
              </p>
            )}
            {canReview && reviewerBarred && (
              <p className="notice">
                <span aria-hidden="true">⚠</span>
                {t.qualitySampleQueue.reviewerBarredNotice}
              </p>
            )}
            {canReview && !reviewerBarred && (
              <>
                <div className="reassign">
                  {(['correct', 'partially', 'wrong'] as QualityVerdict[]).map((v) => (
                    <button
                      key={v}
                      className={`btn ${verdict === v ? 'btn-primary' : 'btn-ghost'}`}
                      disabled={busy}
                      onClick={() => setVerdict(v)}
                    >
                      {t.qualitySampleQueue.verdictLabels[v]}
                    </button>
                  ))}
                </div>
                {verdict && verdict !== 'correct' && (
                  <select
                    className="select"
                    value={failureKind}
                    onChange={(e) => setFailureKind(e.target.value as QualityFailureKind)}
                    disabled={busy}
                    style={{ marginTop: 'var(--space-2)' }}
                  >
                    <option value="">{t.qualitySampleQueue.failureKindPlaceholder}</option>
                    {(Object.keys(t.qualitySampleQueue.failureKindLabels) as QualityFailureKind[]).map((k) => (
                      <option key={k} value={k}>{t.qualitySampleQueue.failureKindLabels[k]}</option>
                    ))}
                  </select>
                )}
                <textarea
                  className="textarea"
                  rows={3}
                  placeholder={t.qualitySampleQueue.notePlaceholder}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={busy}
                  style={{ marginTop: 'var(--space-2)' }}
                />
                {error && <p className="error">{error}</p>}
                <button className="btn btn-primary" onClick={submit} disabled={busy || !verdict}>
                  {busy ? t.qualitySampleQueue.saving : t.qualitySampleQueue.saveVerdictButton}
                </button>
              </>
            )}
            {sample.verdict && (
              <p className="timeline-meta">
                {t.qualitySampleQueue.alreadyReviewedPrefix} {sample.reviewer?.full_name ?? t.common.dash} {t.qualitySampleQueue.alreadyReviewedMiddle} {sample.reviewed_at ?? t.common.dash} {t.qualitySampleQueue.alreadyReviewedSuffix}
              </p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
