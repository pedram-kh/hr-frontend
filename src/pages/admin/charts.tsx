// Sprint 8 (plan.md §10, ADR-0030) — the shared, hand-rolled chart primitives.
// Tokens-only CSS (`.kpi-tile`/`.chart-bars`/`.chart-line-*` in index.css); no
// charting dependency, the same "no layout dependency" discipline `GraphForm`
// (Hierarchy.tsx) already established for the lens graph's SVG connectors.

export function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div className="kpi-tile">
      <span className="kpi-tile-label">{label}</span>
      <span className="kpi-tile-value">{value}</span>
      {sub && <span className="kpi-tile-sub">{sub}</span>}
    </div>
  );
}

/** A fixed-height row of bars, height proportional to value/max (plan.md §10). */
export function BarChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return <p className="muted">Sin datos.</p>;
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="chart-bars">
      {data.map((d) => (
        <div className="chart-bar-col" key={d.label}>
          <span className="chart-bar-value">{d.value}</span>
          <div className="chart-bar" style={{ height: `${Math.max(2, (d.value / max) * 120)}px` }} />
          <span className="chart-bar-label" title={d.label}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * A hand-rolled SVG line/area chart over an arithmetic (x, y) grid — the same
 * absolutely-positioned-arithmetic-layout discipline `GraphForm`'s SVG
 * connector overlay already established, applied here to a trend series
 * (deflection rate, gaps-closed, quality-verdict mix over time).
 */
export function LineChart({
  data,
  height = 140,
  width = 480,
  formatValue,
}: {
  data: { label: string; value: number }[];
  height?: number;
  width?: number;
  formatValue?: (v: number) => string;
}) {
  if (data.length === 0) return <p className="muted">Sin datos.</p>;

  const max = Math.max(1, ...data.map((d) => d.value));
  const plotH = height - 20; // leave room for the x-axis tick labels
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: data.length > 1 ? i * stepX : width / 2,
    y: plotH - (d.value / max) * (plotH - 8) - 4,
    ...d,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${plotH} L ${points[0].x.toFixed(1)} ${plotH} Z`;
  const tickEvery = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div className="chart-line-wrap">
      <svg className="chart-line-svg" width={width} height={height} role="img" aria-label="trend chart">
        <line className="chart-line-axis" x1={0} y1={plotH} x2={width} y2={plotH} />
        <path className="chart-line-area" d={areaD} />
        <path className="chart-line-path" d={pathD} />
        {points.map((p, i) => (
          <circle className="chart-line-dot" key={`d${i}`} cx={p.x} cy={p.y} r={3}>
            <title>{`${p.label}: ${formatValue ? formatValue(p.value) : p.value}`}</title>
          </circle>
        ))}
        {points.map(
          (p, i) =>
            (i === 0 || i === points.length - 1 || i % tickEvery === 0) && (
              <text className="chart-line-tick" key={`t${i}`} x={p.x} y={height - 4} textAnchor="middle">
                {p.label}
              </text>
            ),
        )}
      </svg>
    </div>
  );
}
