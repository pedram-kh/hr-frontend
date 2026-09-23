import { useEffect, useRef, useState } from 'react';
import {
  ApiError,
  createEmployee,
  getEmployee,
  getConvenioGroups,
  getJobCategories,
  getVocabulary,
  listEmployees,
  markEmployeeReviewed,
  updateEmployee,
  type EmployeeAuditEntry,
  type EmployeeDetail,
  type EmployeeListRow,
  type EmployeeWritePayload,
  type ConvenioGroupOption,
  type JobCategoryOption,
  type VocabularyItem,
} from '../../lib/api';
import { CsvImportPanel } from './CsvImportPanel';
import { useT, useLocale } from '../../i18n/context';
import { formatDate } from '../../i18n/format';

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
//
// Sprint 7g Item 2 — `initialEmployeeUuid` is the one-shot deep-link prop
// AdminShell reads out of `#view=directory&emp=<uuid>` (ADR-0029's fix_link
// scheme, e.g. `salary_coverage_gap.no_convenio`, `employee_group_unknown`).
// Opens straight to that employee's edit drawer; `getEmployee` fetches by
// uuid independently of the (possibly filtered) list below.
export function DirectoryPage({ initialEmployeeUuid = null }: { initialEmployeeUuid?: string | null }) {
  // Sprint 11b (plan.md §C.9 step 4 — CP-1 slice: this file's full extraction).
  const t = useT();
  const { locale } = useLocale();
  const [rows, setRows] = useState<EmployeeListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [convenios, setConvenios] = useState<VocabularyItem[]>([]);
  const [territories, setTerritories] = useState<VocabularyItem[]>([]);
  const [convenioId, setConvenioId] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<string | null>(initialEmployeeUuid);
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
              placeholder={t.directory.searchPlaceholder}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={t.directory.searchAriaLabel}
            />
          </form>
          <select className="select" value={convenioId} onChange={(e) => setConvenioId(e.target.value)} aria-label={t.directory.filterConvenioAriaLabel}>
            <option value="">{t.directory.allConvenios}</option>
            {convenios.map((c) => (
              <option key={c.id} value={c.id}>{c.numero} — {c.name}</option>
            ))}
          </select>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t.directory.filterStatusAriaLabel}>
            <option value="">{t.directory.allStatuses}</option>
            <option value="active">{t.directory.activePlural}</option>
            <option value="inactive">{t.directory.inactivePlural}</option>
          </select>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>{t.directory.newEmployee}</button>
          <button className="btn btn-secondary" onClick={() => setShowImport((s) => !s)}>
            {showImport ? t.directory.hideImport : t.directory.importCsv}
          </button>
        </div>

        {showImport && <CsvImportPanel onImported={load} />}

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="muted">{t.directory.loading}</p>
        ) : (
          <table className="docs-table">
            <thead>
              <tr>
                <th>{t.directory.colName}</th><th>{t.directory.colEmail}</th><th>{t.directory.colConvenio}</th><th>{t.directory.colTerritory}</th>
                <th>{t.directory.colCategory}</th><th>{t.directory.colGroup}</th><th>{t.directory.colStatus}</th><th>{t.directory.colReview}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.uuid} className={selected === r.uuid ? 'is-selected' : ''} onClick={() => setSelected(r.uuid)}>
                  <td>{r.full_name}</td>
                  <td>{r.email}</td>
                  <td>{r.convenio ? r.convenio.numero : t.directory.dash}</td>
                  <td>{r.territory ? r.territory.name : t.directory.dash}</td>
                  <td>{r.job_category ? r.job_category.name : t.directory.dash}</td>
                  <td>{r.convenio_group ? r.convenio_group.path_label : <span className="muted">{t.directory.noGroup}</span>}</td>
                  <td>
                    <span className={`badge ${r.status === 'active' ? 'badge-verified' : 'badge-historical'}`}>
                      {r.status === 'active' ? t.directory.statusActive : t.directory.statusInactive}
                    </span>
                  </td>
                  <td>
                    {isStale(r.profile_last_reviewed_at) ? (
                      <span className="badge badge-review"><span aria-hidden="true">⏳</span> {t.directory.notReviewed}</span>
                    ) : (
                      <span className="muted">{formatDate(r.profile_last_reviewed_at, locale)}</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="col-empty">{t.directory.noMatches}</td></tr>
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
  job_category_id: null, convenio_group_id: null, territory_id: 0, work_location: '', employment_type: 'full_time',
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
  const t = useT();
  const { locale } = useLocale();
  const isNew = uuid === null;
  const [detail, setDetail] = useState<EmployeeDetail | null>(null);
  const [audit, setAudit] = useState<EmployeeAuditEntry[]>([]);
  const [form, setForm] = useState<EmployeeWritePayload>(EMPTY_FORM);
  const [jobCategories, setJobCategories] = useState<JobCategoryOption[]>([]);
  const [groups, setGroups] = useState<ConvenioGroupOption[]>([]);
  // Set only when the pre-filled group came from the category mapping, so the
  // form can say WHERE the default came from and ask for confirmation.
  const [groupSuggested, setGroupSuggested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(isNew);
  // Email-change confirm gate (the server returns 409 if unconfirmed).
  const [emailConfirm, setEmailConfirm] = useState<{ old: string; next: string } | null>(null);
  const originalEmail = useRef<string>('');

  // Always-current view of the form, so the group-suggestion effect below can ask
  // "is this field still empty?" WITHOUT depending on the field it sets — that
  // dependency would re-fetch the tree on every edit. Synced in an effect rather
  // than during render, and declared before that effect so it is already current
  // when the effect runs in the same commit.
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

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
          convenio_group_id: employee.convenio_group_id,
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

  // Sprint 7f — the APPROVED group tree for this convenio, reloaded when either
  // the convenio or the category changes (the category is what can suggest a
  // default). A convenio with no groups yet simply yields an empty picker, which
  // is the honest state for most of the corpus.
  useEffect(() => {
    if (!form.convenio_id) { setGroups([]); setGroupSuggested(false); return; }
    let cancelled = false;
    getConvenioGroups(form.convenio_id, form.job_category_id)
      .then((r) => {
        if (cancelled) return;
        setGroups(r.items);

        // Pre-fill ONLY when the field is still empty. A suggestion must never
        // overwrite a group an admin already chose or one already stored on the
        // employee — and the notice must only appear when a pre-fill actually
        // happened, otherwise it would claim an admin's own choice came from the
        // category. Read through a ref so this sees the CURRENT value without
        // making the effect depend on it (which would re-run it on every edit).
        if (r.suggested_group_id && !formRef.current.convenio_group_id) {
          setForm((f) => ({ ...f, convenio_group_id: r.suggested_group_id }));
          setGroupSuggested(true);
        }
      })
      .catch(() => { if (!cancelled) { setGroups([]); setGroupSuggested(false); } });
    return () => { cancelled = true; };
  }, [form.convenio_id, form.job_category_id]);

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
      <aside className="detail panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t.directory.drawer.ariaLabel}>
        <div className="detail-head">
          <strong>{isNew ? t.directory.drawer.newTitle : detail?.full_name ?? t.directory.drawer.defaultTitle}</strong>
          <button className="btn btn-ghost" onClick={onClose} aria-label={t.directory.drawer.close}>✕</button>
        </div>
        <div className="detail-body">
          {!loaded ? (
            <p className="muted">{t.directory.drawer.loading}</p>
          ) : (
            <>
              <section>
                <div className="field">
                  <label className="field-label">{t.directory.drawer.fullNameLabel}</label>
                  <input className="input" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} disabled={busy} />
                </div>
                <div className="field">
                  <label className="field-label">{t.directory.drawer.emailLabel}</label>
                  <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} disabled={busy} />
                  {emailChanged && (
                    <p className="notice">
                      <span aria-hidden="true">⚠</span> {t.directory.drawer.emailChangeWarning}
                    </p>
                  )}
                </div>
                <div className="field">
                  <label className="field-label">{t.directory.drawer.convenioLabel}</label>
                  <select className="select" value={form.convenio_id || ''} onChange={(e) => { set('convenio_id', Number(e.target.value)); set('job_category_id', null); set('convenio_group_id', null); setGroupSuggested(false); }} disabled={busy}>
                    <option value="">{t.directory.drawer.choose}</option>
                    {convenios.map((c) => (<option key={c.id} value={c.id}>{c.numero} — {c.name}</option>))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">{t.directory.drawer.jobCategoryLabel}</label>
                  <select className="select" value={form.job_category_id ?? ''} onChange={(e) => {
                      set('job_category_id', e.target.value ? Number(e.target.value) : null);
                      // Discard a group that was only a SUGGESTION from the previous
                      // category, so the notice never describes a default derived
                      // from a category that is no longer selected. An admin's own
                      // choice (groupSuggested === false) is left untouched.
                      if (groupSuggested) { set('convenio_group_id', null); setGroupSuggested(false); }
                    }} disabled={busy || !form.convenio_id}>
                    <option value="">{form.convenio_id ? t.directory.drawer.noCategory : t.directory.drawer.chooseConvenioFirst}</option>
                    {jobCategories.map((j) => (<option key={j.id} value={j.id}>{j.name}</option>))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">{t.directory.drawer.convenioGroupLabel}</label>
                  <select
                    className="select"
                    value={form.convenio_group_id ?? ''}
                    onChange={(e) => { set('convenio_group_id', e.target.value ? Number(e.target.value) : null); setGroupSuggested(false); }}
                    disabled={busy || !form.convenio_id || groups.length === 0}
                  >
                    <option value="">
                      {!form.convenio_id
                        ? t.directory.drawer.chooseConvenioFirst
                        : groups.length === 0
                          ? t.directory.drawer.noGroupsApproved
                          : t.directory.drawer.noGroupOption}
                    </option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.depth === 1 ? `\u00a0\u00a0\u00a0\u00a0↳ ${g.label}` : g.label}
                      </option>
                    ))}
                  </select>
                  {groupSuggested && (
                    <p className="notice">
                      <span aria-hidden="true">💡</span> {t.directory.drawer.groupSuggestedNotice}
                    </p>
                  )}
                  {!groupSuggested && form.convenio_group_id === null && groups.length > 0 && (
                    <p className="muted">{t.directory.drawer.groupNotSuggestedNotice}</p>
                  )}
                </div>
                <div className="field">
                  <label className="field-label">{t.directory.drawer.territoryLabel}</label>
                  <select className="select" value={form.territory_id || ''} onChange={(e) => set('territory_id', Number(e.target.value))} disabled={busy}>
                    <option value="">{t.directory.drawer.choose}</option>
                    {territories.map((terr) => (<option key={terr.id} value={terr.id}>{terr.code ? `${terr.code} — ` : ''}{terr.name}</option>))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">{t.directory.drawer.employmentTypeLabel}</label>
                  <select className="select" value={form.employment_type} onChange={(e) => set('employment_type', e.target.value)} disabled={busy}>
                    <option value="full_time">{t.directory.drawer.fullTime}</option>
                    <option value="part_time">{t.directory.drawer.partTime}</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">{t.directory.drawer.workLocationLabel}</label>
                  <input className="input" value={form.work_location ?? ''} onChange={(e) => set('work_location', e.target.value)} disabled={busy} />
                </div>
                <div className="field">
                  <label className="field-label">{t.directory.drawer.externalIdLabel}</label>
                  <input className="input" value={form.employee_external_id ?? ''} onChange={(e) => set('employee_external_id', e.target.value)} disabled={busy} />
                </div>
                <div className="field">
                  <label className="field-label">{t.directory.drawer.statusLabel}</label>
                  <select className="select" value={form.status} onChange={(e) => set('status', e.target.value)} disabled={busy}>
                    <option value="active">{t.directory.statusActive}</option>
                    <option value="inactive">{t.directory.drawer.inactiveHint}</option>
                  </select>
                </div>

                {error && <p className="error">{error}</p>}

                <div className="reassign">
                  <button className="btn btn-primary" onClick={() => submit(false)} disabled={busy || !form.full_name || !form.email || !form.convenio_id || !form.territory_id}>
                    {busy ? t.directory.drawer.saving : isNew ? t.directory.drawer.createEmployee : t.directory.drawer.saveChanges}
                  </button>
                </div>
              </section>

              {!isNew && detail && (
                <section>
                  <h4>{t.directory.drawer.reviewTitle}</h4>
                  <p className="timeline-meta">
                    {detail.profile_last_reviewed_at
                      ? `${t.directory.drawer.lastReviewedPrefix} ${formatDate(detail.profile_last_reviewed_at, locale)}.`
                      : t.directory.drawer.neverReviewed}
                    {' '}{t.directory.drawer.lastReviewedNote}
                  </p>
                  <button className="btn btn-secondary" onClick={review} disabled={busy}>{t.directory.drawer.markReviewed}</button>
                </section>
              )}

              {!isNew && (
                <section>
                  <h4>{t.directory.drawer.historyTitle}</h4>
                  {audit.length === 0 ? (
                    <p className="muted">{t.directory.drawer.noChangesRecorded}</p>
                  ) : (
                    <ol className="timeline">
                      {audit.map((a, i) => (
                        <li key={i} className="timeline-item">
                          <span className="timeline-dot src-admin_manual" aria-hidden="true" />
                          <div>
                            <div className="timeline-action">
                              {a.field_changed === '*' ? t.directory.drawer.created : a.field_changed.replace(/_/g, ' ')}
                              {(a.old_value || a.new_value) && a.field_changed !== '*' && (
                                <span className="timeline-value"> {a.old_value ?? t.directory.dash} → {a.new_value ?? t.directory.dash}</span>
                              )}
                            </div>
                            <div className="timeline-meta">
                              {formatDate(a.changed_at, locale, { dateStyle: 'medium', timeStyle: 'short' })}
                              {a.changed_by ? ` · ${a.changed_by}` : ''}
                            </div>
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
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t.directory.drawer.confirmEmailChange.ariaLabel}>
          <div className="modal">
            <h4 className="modal-title"><span aria-hidden="true">⚠</span> {t.directory.drawer.confirmEmailChange.title}</h4>
            <p className="modal-body">
              {t.directory.drawer.confirmEmailChange.bodyPrefix} <code>{emailConfirm.old}</code> {t.directory.drawer.confirmEmailChange.bodyMiddle}{' '}
              <code>{emailConfirm.next}</code>. {t.directory.drawer.confirmEmailChange.bodySuffix}
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEmailConfirm(null)} disabled={busy}>{t.directory.drawer.confirmEmailChange.cancel}</button>
              <button className="btn btn-warning" onClick={() => { setEmailConfirm(null); submit(true); }} disabled={busy}>{t.directory.drawer.confirmEmailChange.confirm}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
