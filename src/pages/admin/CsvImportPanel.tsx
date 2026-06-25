import { useState } from 'react';
import { ApiError, importEmployeeCsv, validateEmployeeCsv, type CsvReport } from '../../lib/api';

// CSV bootstrap for the directory (ADR-0004). Two-phase by design: upload → a
// per-row dry-run report (validate, writes nothing) → apply the valid rows. A
// bad row is REPORTED, never silently dropped (the server is the authority; this
// only surfaces its report). Apply imports the valid rows even when some fail.
export function CsvImportPanel({ onImported }: { onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<CsvReport | null>(null);
  const [phase, setPhase] = useState<'idle' | 'validated' | 'applied'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setReport(null);
    setPhase('idle');
    setError(null);
  };

  const pick = (f: File | null) => {
    setFile(f);
    reset();
  };

  const runValidate = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const r = await validateEmployeeCsv(file);
      setReport(r);
      setPhase('validated');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const runApply = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const r = await importEmployeeCsv(file);
      setReport(r);
      setPhase('applied');
      onImported();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="edit-block">
      <h4>Importar empleados (CSV)</h4>
      <p className="timeline-meta">
        Columnas: <code>email</code>, <code>full_name</code>, <code>convenio_numero</code> (obligatorias);
        opcionales <code>territory_code</code>, <code>job_category</code>, <code>employment_type</code>,
        <code> work_location</code>, <code>employee_external_id</code>, <code>start_date</code>. Primero se
        valida (sin escribir nada); las filas con error se informan, no se descartan en silencio.
      </p>

      <div className="reassign">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
          disabled={busy}
        />
        <button className="btn btn-secondary" onClick={runValidate} disabled={busy || !file}>
          {busy && phase === 'idle' ? 'Validando…' : 'Validar (simulación)'}
        </button>
        {phase === 'validated' && report?.ok && report.summary.valid > 0 && (
          <button className="btn btn-primary" onClick={runApply} disabled={busy}>
            {busy ? 'Importando…' : `Importar ${report.summary.valid} fila(s) válida(s)`}
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {report && !report.ok && (
        <p className="notice">
          <span aria-hidden="true">⛔</span> {report.error}
        </p>
      )}

      {report && report.ok && (
        <>
          <p className="notice notice--neutral" style={{ marginTop: 'var(--space-2)' }}>
            {phase === 'applied' ? (
              <>Importadas: <strong>{report.summary.created}</strong> creadas, <strong>{report.summary.updated}</strong> actualizadas
              {report.summary.invalid > 0 && <> · {report.summary.invalid} con error (no aplicadas).</>}</>
            ) : (
              <>Simulación: {report.summary.total} fila(s) · <strong>{report.summary.valid}</strong> válidas ·
              <strong> {report.summary.invalid}</strong> con error.</>
            )}
          </p>

          <table className="docs-table">
            <thead>
              <tr><th className="num">Fila</th><th>Email</th><th>Acción</th><th>Estado</th><th>Detalle</th></tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.row_number}>
                  <td className="num">{row.row_number}</td>
                  <td>{row.email || <span className="muted">—</span>}</td>
                  <td>{row.action}</td>
                  <td>
                    <span className={`badge ${row.status === 'pass' ? 'badge-verified' : 'badge-conflict'}`}>
                      {row.status === 'pass' ? 'OK' : 'Error'}
                    </span>
                  </td>
                  <td>{row.errors.length > 0 ? row.errors.join(' ') : <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
