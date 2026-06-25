import { useEffect, useRef, useState } from 'react';
import {
  ApiError,
  createEmployee,
  getEmployee,
  getJobCategories,
  getVocabulary,
  listEmployees,
  markEmployeeReviewed,
  updateEmployee,
  type EmployeeAuditEntry,
  type EmployeeDetail,
  type EmployeeListRow,
  type EmployeeWritePayload,
  type JobCategoryOption,
  type VocabularyItem,
} from '../../lib/api';
import { CsvImportPanel } from './CsvImportPanel';

// Reviewed-staleness threshold: a profile not attested in ~6 months is "stale".
// (Editing does NOT reset it — Q9 — so the signal stays an honest review marker.)
const STALE_DAYS = 183;

function isStale(reviewedAt: string | null): boolean {
  if (!reviewedAt) return true;
  const days = (Date.now() - new Date(reviewedAt).getTime()) / 86_400_000;
  return days > STALE_DAYS;
}

// The employee directory (ADR-0004). List/search/filter + an FK-picker edit
// drawer (existing vocabulary only). Every change is audited server-side; the
// drawer shows that timeline. Editing email warns + requires a server confirm.
export function DirectoryPage() {
  const [rows, setRows] = useState<EmployeeListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [convenios, setConvenios] = useState<VocabularyItem[]>([]);
  const [territories, setTerritories] = useState<VocabularyItem[]>([]);
  const [convenioId, setConvenioId] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    getVocabulary('convenios').then((r) => setConvenios(r.items)).catch(() => setConvenios([]));
    getVocabulary('territories').then((r) => setTerritories(r.items)).catch(() => setTerritories([]));
  }, []);

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (q.trim()) params.q = q.trim();
    if (convenioId) params.convenio_id = convenioId;
    if (status) params.status = status;
    listEmployees(params)
      .then((p) => setRows(p.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [convenioId, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  return (
    <>
      <div className="docs-main">
        <div className="docs-toolbar">
          <form onSubmit={onSearch} style={{ display: 'contents' }}>
            <input
              className="input"
              placeholder="Buscar por nombre o correo…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Buscar empleados"
            />
          </form>
          <select className="select" value={convenioId} onChange={(e) => setConvenioId(e.target.value)} aria-label="Filtrar por convenio">
            <option value="">Todos los convenios</option>
            {convenios.map((c) => (
              <option key={c.id} value={c.id}>{c.numero} — {c.name}</option>
            ))}
          </select>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por estado">
            <option value="">Activos e inactivos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>Nuevo empleado</button>
          <button className="btn btn-secondary" onClick={() => setShowImport((s) => !s)}>
            {showImport ? 'Ocultar importación' : 'Importar CSV'}
          </button>
        </div>

        {showImport && <CsvImportPanel onImported={load} />}

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : (
          <table className="docs-table">
            <thead>
              <tr>
                <th>Nombre</th><th>Correo</th><th>Convenio</th><th>Territorio</th>
                <th>Categoría</th><th>Estado</th><th>Revisión</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.uuid} className={selected === r.uuid ? 'is-selected' : ''} onClick={() => setSelected(r.uuid)}>
                  <td>{r.full_name}</td>
                  <td>{r.email}</td>
                  <td>{r.convenio ? r.convenio.numero : '—'}</td>
                  <td>{r.territory ? r.territory.name : '—'}</td>
                  <td>{r.job_category ? r.job_category.name : '—'}</td>
                  <td>
                    <span className={`badge ${r.status === 'active' ? 'badge-verified' : 'badge-historical'}`}>
                      {r.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    {isStale(r.profile_last_reviewed_at) ? (
                      <span className="badge badge-review"><span aria-hidden="true">⏳</span> Sin revisar</span>
                    ) : (
                      <span className="muted">{r.profile_last_reviewed_at?.slice(0, 10)}</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="col-empty">No hay empleados que coincidan.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {(selected || creating) && (
        <EmployeeDrawer
          uuid={creating ? null : selected}
          convenios={convenios}
          territories={territories}
          onClose={() => { setSelected(null); setCreating(false); }}
          onSaved={() => { load(); }}
        />
      )}
    </>
  );
}

// ---------- Edit / create drawer ----------------------------------------------

const EMPTY_FORM: EmployeeWritePayload = {
  email: '', full_name: '', employee_external_id: '', convenio_id: 0,
  job_category_id: null, territory_id: 0, work_location: '', employment_type: 'full_time',
  start_date: '', status: 'active',
};

function EmployeeDrawer({
  uuid,
  convenios,
  territories,
  onClose,
  onSaved,
}: {
  uuid: string | null;
  convenios: VocabularyItem[];
  territories: VocabularyItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = uuid === null;
  const [detail, setDetail] = useState<EmployeeDetail | null>(null);
  const [audit, setAudit] = useState<EmployeeAuditEntry[]>([]);
  const [form, setForm] = useState<EmployeeWritePayload>(EMPTY_FORM);
  const [jobCategories, setJobCategories] = useState<JobCategoryOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(isNew);
  // Email-change confirm gate (the server returns 409 if unconfirmed).
  const [emailConfirm, setEmailConfirm] = useState<{ old: string; next: string } | null>(null);
  const originalEmail = useRef<string>('');

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    if (isNew) { setLoaded(true); return; }
    getEmployee(uuid!)
      .then(({ employee, audit_log }) => {
        setDetail(employee);
        setAudit(audit_log);
        originalEmail.current = employee.email;
        setForm({
          email: employee.email,
          full_name: employee.full_name,
          employee_external_id: employee.employee_external_id ?? '',
          convenio_id: employee.convenio_id ?? 0,
          job_category_id: employee.job_category_id,
          territory_id: employee.territory_id ?? 0,
          work_location: employee.work_location ?? '',
          employment_type: employee.employment_type,
          start_date: employee.start_date ?? '',
          status: employee.status,
        });
        setLoaded(true);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));
  }, [uuid, isNew]);

  // Load convenio-scoped job categories whenever the convenio changes.
  useEffect(() => {
    if (!form.convenio_id) { setJobCategories([]); return; }
    getJobCategories(form.convenio_id).then((r) => setJobCategories(r.items)).catch(() => setJobCategories([]));
  }, [form.convenio_id]);

  const set = <K extends keyof EmployeeWritePayload>(key: K, value: EmployeeWritePayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const emailChanged = !isNew && form.email.trim().toLowerCase() !== originalEmail.current.toLowerCase();

  const submit = async (confirmEmail = false) => {
    setBusy(true);
    setError(null);
    const payload: EmployeeWritePayload = {
      ...form,
      employee_external_id: form.employee_external_id || null,
      work_location: form.work_location || null,
      start_date: form.start_date || null,
      confirm_email_change: confirmEmail,
    };
    try {
      if (isNew) await createEmployee(payload);
      else await updateEmployee(uuid!, payload);
      onSaved();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.body?.code === 'email_change_confirmation_required') {
        setEmailConfirm({ old: String(e.body.old_email ?? originalEmail.current), next: String(e.body.new_email ?? form.email) });
      } else {
        setError(e instanceof ApiError ? e.message : String(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const review = async () => {
    if (isNew) return;
    setBusy(true);
    try {
      await markEmployeeReviewed(uuid!);
      const { employee, audit_log } = await getEmployee(uuid!);
      setDetail(employee);
      setAudit(audit_log);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <aside className="detail panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Empleado">
        <div className="detail-head">
          <strong>{isNew ? 'Nuevo empleado' : detail?.full_name ?? 'Empleado'}</strong>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="detail-body">
          {!loaded ? (
            <p className="muted">Cargando…</p>
          ) : (
            <>
              <section>
                <div className="field">
                  <label className="field-label">Nombre completo</label>
                  <input className="input" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} disabled={busy} />
                </div>
                <div className="field">
                  <label className="field-label">Correo (clave de acceso)</label>
                  <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} disabled={busy} />
                  {emailChanged && (
                    <p className="notice">
                      <span aria-hidden="true">⚠</span> Cambiar el correo cambia cómo inicia sesión esta persona.
                      Se pedirá confirmación explícita.
                    </p>
                  )}
                </div>
                <div className="field">
                  <label className="field-label">Convenio</label>
                  <select className="select" value={form.convenio_id || ''} onChange={(e) => { set('convenio_id', Number(e.target.value)); set('job_category_id', null); }} disabled={busy}>
                    <option value="">Selecciona…</option>
                    {convenios.map((c) => (<option key={c.id} value={c.id}>{c.numero} — {c.name}</option>))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Categoría profesional</label>
                  <select className="select" value={form.job_category_id ?? ''} onChange={(e) => set('job_category_id', e.target.value ? Number(e.target.value) : null)} disabled={busy || !form.convenio_id}>
                    <option value="">{form.convenio_id ? 'Sin categoría' : 'Elige primero un convenio'}</option>
                    {jobCategories.map((j) => (<option key={j.id} value={j.id}>{j.name}</option>))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Territorio</label>
                  <select className="select" value={form.territory_id || ''} onChange={(e) => set('territory_id', Number(e.target.value))} disabled={busy}>
                    <option value="">Selecciona…</option>
                    {territories.map((t) => (<option key={t.id} value={t.id}>{t.code ? `${t.code} — ` : ''}{t.name}</option>))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Tipo de jornada</label>
                  <select className="select" value={form.employment_type} onChange={(e) => set('employment_type', e.target.value)} disabled={busy}>
                    <option value="full_time">Completa</option>
                    <option value="part_time">Parcial</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Centro de trabajo</label>
                  <input className="input" value={form.work_location ?? ''} onChange={(e) => set('work_location', e.target.value)} disabled={busy} />
                </div>
                <div className="field">
                  <label className="field-label">ID externo</label>
                  <input className="input" value={form.employee_external_id ?? ''} onChange={(e) => set('employee_external_id', e.target.value)} disabled={busy} />
                </div>
                <div className="field">
                  <label className="field-label">Estado</label>
                  <select className="select" value={form.status} onChange={(e) => set('status', e.target.value)} disabled={busy}>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo (no podrá iniciar sesión ni chatear)</option>
                  </select>
                </div>

                {error && <p className="error">{error}</p>}

                <div className="reassign">
                  <button className="btn btn-primary" onClick={() => submit(false)} disabled={busy || !form.full_name || !form.email || !form.convenio_id || !form.territory_id}>
                    {busy ? 'Guardando…' : isNew ? 'Crear empleado' : 'Guardar cambios'}
                  </button>
                </div>
              </section>

              {!isNew && detail && (
                <section>
                  <h4>Revisión del perfil</h4>
                  <p className="timeline-meta">
                    {detail.profile_last_reviewed_at
                      ? `Revisado por última vez el ${detail.profile_last_reviewed_at.slice(0, 10)}.`
                      : 'Nunca revisado.'}
                    {' '}Editar no cuenta como revisar: es una atestación explícita.
                  </p>
                  <button className="btn btn-secondary" onClick={review} disabled={busy}>Marcar como revisado</button>
                </section>
              )}

              {!isNew && (
                <section>
                  <h4>Historial de cambios</h4>
                  {audit.length === 0 ? (
                    <p className="muted">Sin cambios registrados.</p>
                  ) : (
                    <ol className="timeline">
                      {audit.map((a, i) => (
                        <li key={i} className="timeline-item">
                          <span className="timeline-dot src-admin_manual" aria-hidden="true" />
                          <div>
                            <div className="timeline-action">
                              {a.field_changed === '*' ? 'creado' : a.field_changed.replace(/_/g, ' ')}
                              {(a.old_value || a.new_value) && a.field_changed !== '*' && (
                                <span className="timeline-value"> {a.old_value ?? '—'} → {a.new_value ?? '—'}</span>
                              )}
                            </div>
                            <div className="timeline-meta">{a.changed_at?.slice(0, 19).replace('T', ' ')}{a.changed_by ? ` · ${a.changed_by}` : ''}</div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </aside>

      {emailConfirm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirmar cambio de correo">
          <div className="modal">
            <h4 className="modal-title"><span aria-hidden="true">⚠</span> ¿Cambiar el correo de acceso?</h4>
            <p className="modal-body">
              El correo es la clave de inicio de sesión. Vas a cambiarlo de <code>{emailConfirm.old}</code> a{' '}
              <code>{emailConfirm.next}</code>. La persona iniciará sesión con el nuevo correo. El cambio queda registrado.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEmailConfirm(null)} disabled={busy}>Cancelar</button>
              <button className="btn btn-warning" onClick={() => { setEmailConfirm(null); submit(true); }} disabled={busy}>Confirmar cambio</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
