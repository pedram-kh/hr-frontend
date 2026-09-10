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

/**
 * Sprint 8, Step 7 (plan.md §2/§3/§4, ADR-0030) — the Analítica screen.
 * Every number here is a thin read over `AnalyticsController`, which is
 * itself a thin read over the SAME services `stats:deflection`/
 * `stats:escalations-by-fix`/`questions:cluster` call — never a second copy
 * of a definition (the sprint's own hard constraint, restated in the UI).
 */
export function AnalyticsPage() {
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
  if (!deflection || !byFix || !clusters) return <p className="muted">Loading…</p>;

  const summary = deflection.summary;
  const pathData = Object.entries(summary.path_split).map(([label, value]) => ({ label, value }));
  const authorityData = Object.entries(summary.authority_split).map(([label, value]) => ({ label, value }));
  const topicData = Object.entries(clusters.topic_breakdown)
    .slice(0, 10)
    .map(([label, value]) => ({ label, value }));

  return (
    <div className="analytics-page">
      <p className="muted">
        Periodo {deflection.period.from} → {deflection.period.to}. Deflection rate excluye `needs_category` del
        denominador (§2.1, resuelto).
      </p>

      <div className="kpi-row">
        <KpiTile
          label="Tasa de resolución (deflection)"
          value={summary.deflection_rate != null ? `${Math.round(summary.deflection_rate * 100)}%` : '—'}
        />
        <KpiTile label="Respondidas" value={String(summary.answered)} />
        <KpiTile label="Escaladas" value={String(summary.escalated)} />
        <KpiTile label="Necesitan categoría" value={String(summary.needs_category)} sub="excluido del denominador" />
        <KpiTile
          label="Respuestas humanas (RR. HH.)"
          value={String(deflection.hr_agent_replies.reduce((s, r) => s + r.reply_count, 0))}
        />
        <KpiTile
          label="Satisfacción (👍/👍+👎)"
          value={deflection.satisfaction.rate != null ? `${Math.round(deflection.satisfaction.rate * 100)}%` : '—'}
          sub={`${deflection.satisfaction.up}👍 · ${deflection.satisfaction.down}👎 (§7, opcional)`}
        />
      </div>

      <section>
        <h4>Reparto por vía (path_split)</h4>
        <BarChart data={pathData} />
      </section>

      <section>
        <h4>Reparto por autoridad (authority_split)</h4>
        <BarChart data={authorityData} />
      </section>

      <section>
        <h4>Escalaciones por corrección (§3)</h4>
        <p className="timeline-meta">
          {byFix.unexplained_count > 0 && `${byFix.unexplained_count} tarjeta(s) anteriores sin explicación estructurada aún. `}
          {byFix.board_throughput.total_resolved} resueltas en el periodo · tasa de conversión a conocimiento{' '}
          {byFix.board_throughput.conversion_rate != null ? `${Math.round(byFix.board_throughput.conversion_rate * 100)}%` : '—'}.
        </p>
        <table className="docs-table">
          <thead>
            <tr><th>Motivo</th><th>Sub-resultado</th><th>Acción de corrección</th><th className="num">Tarjetas</th><th className="num">Resueltas</th></tr>
          </thead>
          <tbody>
            {byFix.by_fix.map((row, i) => (
              <tr key={i}>
                <td>{row.reason}</td>
                <td className="muted">{row.sub_outcome ?? '—'}</td>
                <td>
                  {row.fix_link ? (
                    <a href={row.fix_link}>{row.fix_action ?? row.fix_surface ?? 'Corregir'}</a>
                  ) : (
                    row.fix_action ?? '—'
                  )}
                </td>
                <td className="num">{row.card_count}</td>
                <td className="num">{row.resolved_count}</td>
              </tr>
            ))}
            {byFix.by_fix.length === 0 && <tr><td colSpan={5} className="col-empty">Sin escalaciones en el periodo.</td></tr>}
          </tbody>
        </table>
      </section>

      <section>
        <h4>Agrupación de preguntas (§4) — ejecución {clusters.run_date}</h4>
        <p className="timeline-meta">
          Etiqueta = medoide del cluster (nunca un resumen de IA). Umbral τ={clusters.clusters[0]?.threshold_used ?? '0.80'}.
        </p>
        <table className="docs-table">
          <thead>
            <tr><th>Medoide</th><th className="num">Miembros</th><th className="num">Similitud (mín–máx)</th><th className="num">Tasa de escalación</th><th>Motivo top</th></tr>
          </thead>
          <tbody>
            {clusters.clusters.map((c) => (
              <tr key={c.id}>
                <td className="cell-clip">{c.medoid_text}</td>
                <td className="num">{c.member_count}</td>
                <td className="num muted small">
                  {c.min_similarity != null ? `${c.min_similarity.toFixed(3)}–${c.max_similarity?.toFixed(3)}` : '(único)'}
                </td>
                <td className="num">{c.escalation_rate != null ? `${Math.round(c.escalation_rate * 100)}%` : '—'}</td>
                <td className="muted small">{c.top_escalation_reason ?? '—'}</td>
              </tr>
            ))}
            {clusters.clusters.length === 0 && <tr><td colSpan={5} className="col-empty">Sin clusters (ejecuta <code>php artisan questions:cluster</code>).</td></tr>}
          </tbody>
        </table>
      </section>

      <section>
        <h4>Preguntas por tema (top 10)</h4>
        <BarChart data={topicData} />
      </section>

      <section>
        <h4>Ranking "sin responder" (escalation_rate × volumen × personas afectadas)</h4>
        <ul className="ranked-list">
          {clusters.unanswered_ranking.map((r, i) => (
            <li className="ranked-row" key={r.cluster_id}>
              <span className="ranked-rank">#{i + 1}</span>
              <div className="ranked-main">
                <div className="ranked-title">{r.medoid_text}</div>
                <div className="ranked-meta">
                  volumen {r.volume} · tasa {Math.round(r.escalation_rate * 100)}% · peso por plantilla {r.headcount_weight} · score {r.score.toFixed(1)}
                </div>
              </div>
            </li>
          ))}
          {clusters.unanswered_ranking.length === 0 && <p className="muted">Sin datos.</p>}
        </ul>
      </section>
    </div>
  );
}
