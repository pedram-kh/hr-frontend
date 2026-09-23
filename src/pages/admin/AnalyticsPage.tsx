import { useEffect, useState } from 'react';
import {
  ApiError,
  getClusters,
  getDeflection,
  getEscalationsByFix,
  type ClustersResponse,
  type DeflectionResponse,
  type EscalationsByFixResponse,
} from '../../lib/api';
import { BarChart, KpiTile } from './charts';
import { escalationReasonLabel } from '../../lib/escalationReasons';
import { subOutcomeLabel } from '../../lib/statusLabels';
import { useLocale, useT } from '../../i18n/context';
import { formatDate, formatPercent } from '../../i18n/format';

/**
 * Sprint 8, Step 7 (plan.md §2/§3/§4, ADR-0030) — the Analítica screen.
 * Every number here is a thin read over `AnalyticsController`, which is
 * itself a thin read over the SAME services `stats:deflection`/
 * `stats:escalations-by-fix`/`questions:cluster` call — never a second copy
 * of a definition (the sprint's own hard constraint, restated in the UI).
 */
export function AnalyticsPage() {
  const t = useT();
  const { locale } = useLocale();
  const [deflection, setDeflection] = useState<DeflectionResponse | null>(null);
  const [byFix, setByFix] = useState<EscalationsByFixResponse | null>(null);
  const [clusters, setClusters] = useState<ClustersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getDeflection(), getEscalationsByFix(), getClusters()])
      .then(([d, f, c]) => {
        setDeflection(d);
        setByFix(f);
        setClusters(c);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!deflection || !byFix || !clusters) return <p className="muted">{t.analyticsPage.loadingText}</p>;

  const summary = deflection.summary;
  const pathData = Object.entries(summary.path_split).map(([label, value]) => ({ label, value }));
  const authorityData = Object.entries(summary.authority_split).map(([label, value]) => ({ label, value }));
  const topicData = Object.entries(clusters.topic_breakdown)
    .slice(0, 10)
    .map(([label, value]) => ({ label, value }));

  return (
    <div className="analytics-page">
      <p className="muted">
        {t.analyticsPage.periodPrefix} {formatDate(deflection.period.from, locale)} → {formatDate(deflection.period.to, locale)}. {t.analyticsPage.periodNote}
      </p>

      <div className="kpi-row">
        <KpiTile
          label={t.analyticsPage.kpiDeflectionRateLabel}
          value={summary.deflection_rate != null ? formatPercent(summary.deflection_rate * 100, locale) : t.common.dash}
        />
        <KpiTile label={t.analyticsPage.kpiAnsweredLabel} value={String(summary.answered)} />
        <KpiTile label={t.analyticsPage.kpiEscalatedLabel} value={String(summary.escalated)} />
        <KpiTile label={t.analyticsPage.kpiNeedsCategoryLabel} value={String(summary.needs_category)} sub={t.analyticsPage.kpiNeedsCategorySub} />
        <KpiTile
          label={t.analyticsPage.kpiHrRepliesLabel}
          value={String(deflection.hr_agent_replies.reduce((s, r) => s + r.reply_count, 0))}
        />
        <KpiTile
          label={t.analyticsPage.kpiSatisfactionLabel}
          value={deflection.satisfaction.rate != null ? formatPercent(deflection.satisfaction.rate * 100, locale) : t.common.dash}
          sub={`${deflection.satisfaction.up}👍 · ${deflection.satisfaction.down}👎 ${t.analyticsPage.kpiSatisfactionSubSuffix}`}
        />
      </div>

      <section>
        <h4>{t.analyticsPage.pathSplitHeading}</h4>
        <BarChart data={pathData} />
      </section>

      <section>
        <h4>{t.analyticsPage.authoritySplitHeading}</h4>
        <BarChart data={authorityData} />
      </section>

      <section>
        <h4>{t.analyticsPage.escalationsByFixHeading}</h4>
        <p className="timeline-meta">
          {byFix.unexplained_count > 0 && `${byFix.unexplained_count} ${t.analyticsPage.unexplainedCountSuffix} `}
          {byFix.board_throughput.total_resolved} {t.analyticsPage.resolvedInPeriodSuffix}{' '}
          {byFix.board_throughput.conversion_rate != null ? formatPercent(byFix.board_throughput.conversion_rate * 100, locale) : t.common.dash}.
        </p>
        <table className="docs-table">
          <thead>
            <tr><th>{t.analyticsPage.reasonHeader}</th><th>{t.analyticsPage.subOutcomeHeader}</th><th>{t.analyticsPage.fixActionHeader}</th><th className="num">{t.analyticsPage.cardsHeader}</th><th className="num">{t.analyticsPage.resolvedHeader}</th></tr>
          </thead>
          <tbody>
            {byFix.by_fix.map((row, i) => (
              <tr key={i}>
                {/* Correction-02 (C2-1): was the raw reason string (e.g.
                    literally "estatuto_fallback_gap") — no label lookup
                    existed on this screen at all. */}
                <td>{escalationReasonLabel(t, row.reason)}</td>
                {/* Sprint 11a (§D.2) — was the raw sub_outcome enum key
                    (e.g. "subarea_not_recorded"); short labels sourced from
                    EscalationExplainer::MATRIX's own registry. */}
                <td className="muted">{subOutcomeLabel(t, row.reason, row.sub_outcome)}</td>
                <td>
                  {row.fix_link ? (
                    <a href={row.fix_link}>{row.fix_action ?? row.fix_surface ?? t.escalationCard.fixLinkLabel}</a>
                  ) : (
                    row.fix_action ?? t.common.dash
                  )}
                </td>
                <td className="num">{row.card_count}</td>
                <td className="num">{row.resolved_count}</td>
              </tr>
            ))}
            {byFix.by_fix.length === 0 && <tr><td colSpan={5} className="col-empty">{t.analyticsPage.noEscalationsInPeriod}</td></tr>}
          </tbody>
        </table>
      </section>

      <section>
        <h4>{t.analyticsPage.clusteringHeadingPrefix} {formatDate(clusters.run_date, locale)}</h4>
        <p className="timeline-meta">
          {t.analyticsPage.clusteringNotePrefix}{clusters.clusters[0]?.threshold_used ?? '0.80'}.
        </p>
        <table className="docs-table">
          <thead>
            <tr><th>{t.analyticsPage.medoidHeader}</th><th className="num">{t.analyticsPage.membersHeader}</th><th className="num">{t.analyticsPage.similarityHeader}</th><th className="num">{t.analyticsPage.escalationRateHeader}</th><th>{t.analyticsPage.topReasonHeader}</th></tr>
          </thead>
          <tbody>
            {clusters.clusters.map((c) => (
              <tr key={c.id}>
                <td className="cell-clip">{c.medoid_text}</td>
                <td className="num">{c.member_count}</td>
                <td className="num muted small">
                  {c.min_similarity != null ? `${c.min_similarity.toFixed(3)}–${c.max_similarity?.toFixed(3)}` : t.analyticsPage.uniqueLabel}
                </td>
                <td className="num">{c.escalation_rate != null ? formatPercent(c.escalation_rate * 100, locale) : t.common.dash}</td>
                <td className="muted small">{escalationReasonLabel(t, c.top_escalation_reason)}</td>
              </tr>
            ))}
            {clusters.clusters.length === 0 && <tr><td colSpan={5} className="col-empty">{t.analyticsPage.noClustersPrefix} <code>php artisan questions:cluster</code>{t.analyticsPage.noClustersSuffix}</td></tr>}
          </tbody>
        </table>
      </section>

      <section>
        <h4>{t.analyticsPage.topicsHeading}</h4>
        <BarChart data={topicData} />
      </section>

      <section>
        <h4>{t.analyticsPage.unansweredRankingHeading}</h4>
        <ul className="ranked-list">
          {clusters.unanswered_ranking.map((r, i) => (
            <li className="ranked-row" key={r.cluster_id}>
              <span className="ranked-rank">#{i + 1}</span>
              <div className="ranked-main">
                <div className="ranked-title">{r.medoid_text}</div>
                <div className="ranked-meta">
                  {t.analyticsPage.volumeLabel} {r.volume} · {t.analyticsPage.rateLabel} {formatPercent(r.escalation_rate * 100, locale)} · {t.analyticsPage.headcountWeightLabel} {r.headcount_weight} · {t.analyticsPage.scoreLabel} {r.score.toFixed(1)}
                </div>
              </div>
            </li>
          ))}
          {clusters.unanswered_ranking.length === 0 && <p className="muted">{t.analyticsPage.noDataNotice}</p>}
        </ul>
      </section>
    </div>
  );
}
