import { useEffect, useState } from 'react';
import {
  ApiError,
  downloadCoverageExport,
  getCoverageGrid,
  getCoverageTrend,
  type CoverageGridResponse,
  type CoverageTrendPoint,
} from '../../lib/api';
import { DocumentDetailPanel } from './DocumentDetailPanel';
import { Hierarchy, type HierarchyForm } from './Hierarchy';
import { ReferenceFactPanel } from './ReferenceFactPanel';
import { LineChart } from './charts';
import { useT } from '../../i18n/context';

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
  const t = useT();
  const [form, setForm] = useState<HierarchyForm>('list');
  const [data, setData] = useState<CoverageGridResponse | null>(null);
  const [trend, setTrend] = useState<CoverageTrendPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Sprint 8 follow-up (found live, eyes-on 2026-09-10): a coverage leaf used
  // to open nothing — `onOpenDocument`/`onOpenFact` were no-ops below. Now
  // mirrors `KnowledgeMapPage`'s exact leaf-opens-card wiring.
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [selectedFact, setSelectedFact] = useState<string | null>(null);

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
  if (!data) return <p className="muted">{t.coveragePage.loadingText}</p>;

  const trendData = (trend ?? []).map((pt) => ({ label: pt.date.slice(5), value: pt.gap_count }));

  return (
    <div className="coverage-page">
      <div className="map-toolbar">
        <div className="seg" role="group" aria-label={t.coveragePage.viewGroupAriaLabel}>
          <button className={`seg-btn ${form === 'graph' ? 'is-active' : ''}`} onClick={() => setForm('graph')}>{t.coveragePage.graphButton}</button>
          <button className={`seg-btn ${form === 'list' ? 'is-active' : ''}`} onClick={() => setForm('list')}>{t.coveragePage.listButton}</button>
        </div>
        <button className="btn btn-secondary" onClick={doExport} disabled={exporting}>
          {exporting ? t.coveragePage.exportingButton : t.coveragePage.exportButton}
        </button>
        <button className="btn btn-ghost" onClick={() => setReloadKey((k) => k + 1)}>{t.coveragePage.refreshButton}</button>
        <span className="muted">{t.coveragePage.asOfPrefix} {data.as_of}</span>
      </div>

      <div className="map-canvas">
        <Hierarchy
          key={`coverage-${reloadKey}`}
          lens="coverage"
          form={form}
          reloadKey={reloadKey}
          onOpenDocument={setSelectedDoc}
          onOpenFact={setSelectedFact}
        />
      </div>

      {selectedDoc && (
        <DocumentDetailPanel
          uuid={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}
      {selectedFact && (
        <ReferenceFactPanel
          uuid={selectedFact}
          onClose={() => setSelectedFact(null)}
          onChanged={() => setReloadKey((k) => k + 1)}
          onOpenDocument={(uuid) => { setSelectedFact(null); setSelectedDoc(uuid); }}
        />
      )}

      <section>
        <h4>{t.coveragePage.fullGapHeadingPrefix} ({data.full_gap_convenios.length})</h4>
        <p className="timeline-meta">{t.coveragePage.fullGapIntro}</p>
        <ul className="ranked-list">
          {data.full_gap_convenios.map((c, i) => (
            <li className="ranked-row" key={c.convenio_id}>
              <span className="ranked-rank">#{i + 1}</span>
              <div className="ranked-main">
                <div className="ranked-title">{c.numero} — {c.name}</div>
                <div className="ranked-meta">
                  {c.territory} · {c.sector} · {c.headcount} {c.headcount === 1 ? t.coveragePage.personWord : t.coveragePage.personsWordPlural}
                  {c.reason_codes.length > 0 && (
                    <span className="reason-badges">
                      {c.reason_codes.map((rc) => (
                        <span className="badge badge-review" key={rc}>{rc}</span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
              <a className="btn btn-ghost" href={c.link}>{t.coveragePage.viewLink}</a>
            </li>
          ))}
          {data.full_gap_convenios.length === 0 && <p className="muted">{t.coveragePage.noFullGapConvenios}</p>}
        </ul>
      </section>

      {data.no_registry_rows.length > 0 && (
        <section>
          <h4>{t.coveragePage.noRegistryHeadingPrefix} ({data.no_registry_rows.length})</h4>
          <table className="docs-table">
            <thead><tr><th>{t.coveragePage.territoryColumn}</th><th>{t.coveragePage.sectorColumn}</th><th className="num">{t.coveragePage.headcountColumn}</th><th>{t.coveragePage.reasonColumn}</th></tr></thead>
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
        <h4>{t.coveragePage.closedGapsHeadingPrefix} {trendData.length} {t.coveragePage.closedGapsHeadingSuffix}</h4>
        <LineChart data={trendData} />
      </section>
    </div>
  );
}
