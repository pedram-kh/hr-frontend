import { useEffect, useState } from 'react';
import {
  ApiError,
  downloadCoverageExport,
  getCoverageGrid,
  getCoverageTrend,
  type CoverageGridResponse,
  type CoverageTrendPoint,
} from '../../lib/api';
import { Hierarchy, type HierarchyForm } from './Hierarchy';
import { LineChart } from './charts';

/**
 * Sprint 8, Step 7 (plan.md §5, ADR-0030) — the Cobertura screen. Gated on
 * `analytics.view` OR `knowledge.edit` server-side (route group); this page
 * itself does no gating (`AdminShell` only shows the nav entry). Every
 * number here reads `CorpusCoverageService::grid()` — the SAME query the
 * `<Hierarchy lens="coverage">` map and the `corpus:coverage` export use
 * (§5.6's "screen and export share one query" hard constraint, true by
 * construction).
 */
export function CoveragePage() {
  const [form, setForm] = useState<HierarchyForm>('list');
  const [data, setData] = useState<CoverageGridResponse | null>(null);
  const [trend, setTrend] = useState<CoverageTrendPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    getCoverageGrid()
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));
    getCoverageTrend(30)
      .then((r) => setTrend(r.trend))
      .catch(() => setTrend([]));
  }, [reloadKey]);

  const doExport = async () => {
    setExporting(true);
    try {
      await downloadCoverageExport();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const trendData = (trend ?? []).map((t) => ({ label: t.date.slice(5), value: t.gap_count }));

  return (
    <div className="coverage-page">
      <div className="map-toolbar">
        <div className="seg" role="group" aria-label="View">
          <button className={`seg-btn ${form === 'graph' ? 'is-active' : ''}`} onClick={() => setForm('graph')}>Graph</button>
          <button className={`seg-btn ${form === 'list' ? 'is-active' : ''}`} onClick={() => setForm('list')}>List</button>
        </div>
        <button className="btn btn-secondary" onClick={doExport} disabled={exporting}>
          {exporting ? 'Exportando…' : '↓ Exportar (.md)'}
        </button>
        <button className="btn btn-ghost" onClick={() => setReloadKey((k) => k + 1)}>↻ Actualizar</button>
        <span className="muted">a fecha de {data.as_of}</span>
      </div>

      <div className="map-canvas">
        <Hierarchy
          key={`coverage-${reloadKey}`}
          lens="coverage"
          form={form}
          reloadKey={reloadKey}
          onOpenDocument={() => {}}
        />
      </div>

      <section>
        <h4>Convenios con brecha total ({data.full_gap_convenios.length})</h4>
        <p className="timeline-meta">Ni prosa, ni salario, ni datos, ni resoluciones — ordenados por plantilla afectada.</p>
        <ul className="ranked-list">
          {data.full_gap_convenios.map((c, i) => (
            <li className="ranked-row" key={c.convenio_id}>
              <span className="ranked-rank">#{i + 1}</span>
              <div className="ranked-main">
                <div className="ranked-title">{c.numero} — {c.name}</div>
                <div className="ranked-meta">
                  {c.territory} · {c.sector} · {c.headcount} persona{c.headcount === 1 ? '' : 's'}
                  {c.reason_codes.length > 0 && (
                    <span className="reason-badges">
                      {c.reason_codes.map((rc) => (
                        <span className="badge badge-review" key={rc}>{rc}</span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
              <a className="btn btn-ghost" href={c.link}>Ver</a>
            </li>
          ))}
          {data.full_gap_convenios.length === 0 && <p className="muted">Ningún convenio con brecha total.</p>}
        </ul>
      </section>

      {data.no_registry_rows.length > 0 && (
        <section>
          <h4>Ámbitos sin convenio de registro ({data.no_registry_rows.length})</h4>
          <table className="docs-table">
            <thead><tr><th>Territorio</th><th>Sector</th><th className="num">Plantilla</th><th>Motivo</th></tr></thead>
            <tbody>
              {data.no_registry_rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.territory}</td>
                  <td>{r.sector}</td>
                  <td className="num">{r.headcount}</td>
                  <td className="muted small"><code>{r.reason_code}</code> — {r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section>
        <h4>Brechas cerradas — tendencia (últimos {trendData.length} instantáneas)</h4>
        <LineChart data={trendData} />
      </section>
    </div>
  );
}
