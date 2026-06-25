import { useEffect, useState } from 'react';
import {
  ApiError,
  createAdmin,
  listAdmins,
  syncAdminRoles,
  updateAdmin,
  type AdminRow,
} from '../../lib/api';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super admin',
  hr_agent: 'Agente de RR. HH.',
  knowledge_editor: 'Editor de conocimiento',
  auditor: 'Auditor',
};

const ROLE_HINTS: Record<string, string> = {
  super_admin: 'Acceso total · gestiona admins · ve todo el histórico',
  hr_agent: 'Trabaja escalaciones · gestiona el directorio',
  knowledge_editor: 'Edita conocimiento · sin acceso a conversaciones',
  auditor: 'Ve y busca todo el histórico (solo lectura)',
};

// Admin & role management (Sprint 5). super_admin only — the most privileged
// surface (granting history.view_all). Roles via spatie; deactivation revokes
// the admin's access immediately (server-side).
export function AdminsPage() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    listAdmins()
      .then((r) => { setAdmins(r.admins); setRoles(r.roles); })
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="docs-main">
      <div className="docs-toolbar">
        <button className="btn btn-primary" onClick={() => setCreating((c) => !c)}>
          {creating ? 'Cancelar' : 'Nuevo administrador'}
        </button>
      </div>

      {creating && <CreateAdmin roles={roles} onCreated={() => { setCreating(false); load(); }} />}

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <table className="docs-table">
          <thead>
            <tr><th>Nombre</th><th>Correo</th><th>Roles</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <AdminRowEditor key={a.uuid} admin={a} roles={roles} onChanged={load} />
            ))}
            {admins.length === 0 && <tr><td colSpan={5} className="col-empty">No hay administradores.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CreateAdmin({ roles, onCreated }: { roles: string[]; onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (role: string) =>
    setPicked((p) => (p.includes(role) ? p.filter((r) => r !== role) : [...p, role]));

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await createAdmin({ email: email.trim(), full_name: fullName.trim(), roles: picked });
      onCreated();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="edit-block">
      <h4>Nuevo administrador</h4>
      <div className="field">
        <label className="field-label">Nombre completo</label>
        <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={busy} />
      </div>
      <div className="field">
        <label className="field-label">Correo</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
      </div>
      <div className="field">
        <label className="field-label">Roles</label>
        <div className="role-checks">
          {roles.map((role) => (
            <label key={role} className="board-filter-check" title={ROLE_HINTS[role]}>
              <input type="checkbox" checked={picked.includes(role)} onChange={() => toggle(role)} disabled={busy} />
              {ROLE_LABELS[role] ?? role}
            </label>
          ))}
        </div>
      </div>
      {err && <p className="error">{err}</p>}
      <button className="btn btn-primary" onClick={submit} disabled={busy || !email.trim() || !fullName.trim()}>
        {busy ? 'Creando…' : 'Crear administrador'}
      </button>
    </section>
  );
}

function AdminRowEditor({ admin, roles, onChanged }: { admin: AdminRow; roles: string[]; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<string[]>(admin.roles);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (role: string) =>
    setPicked((p) => (p.includes(role) ? p.filter((r) => r !== role) : [...p, role]));

  const saveRoles = async () => {
    setBusy(true);
    setErr(null);
    try {
      await syncAdminRoles(admin.uuid, picked);
      setEditing(false);
      onChanged();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async () => {
    setBusy(true);
    setErr(null);
    try {
      await updateAdmin(admin.uuid, { status: admin.status === 'active' ? 'inactive' : 'active' });
      onChanged();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <tr>
        <td>{admin.full_name}</td>
        <td>{admin.email}</td>
        <td>
          {editing ? (
            <div className="role-checks">
              {roles.map((role) => (
                <label key={role} className="board-filter-check" title={ROLE_HINTS[role]}>
                  <input type="checkbox" checked={picked.includes(role)} onChange={() => toggle(role)} disabled={busy} />
                  {ROLE_LABELS[role] ?? role}
                </label>
              ))}
            </div>
          ) : (
            admin.roles.length > 0
              ? admin.roles.map((r) => <span key={r} className="chip">{ROLE_LABELS[r] ?? r}</span>)
              : <span className="muted">sin rol</span>
          )}
        </td>
        <td>
          <span className={`badge ${admin.status === 'active' ? 'badge-verified' : 'badge-historical'}`}>
            {admin.status === 'active' ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td className="num">
          {editing ? (
            <>
              <button className="btn btn-primary" onClick={saveRoles} disabled={busy}>Guardar</button>
              <button className="btn btn-ghost" onClick={() => { setEditing(false); setPicked(admin.roles); }} disabled={busy}>Cancelar</button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={() => setEditing(true)} disabled={busy}>Roles</button>
              <button className={`btn ${admin.status === 'active' ? 'btn-warning' : 'btn-secondary'}`} onClick={toggleStatus} disabled={busy}>
                {admin.status === 'active' ? 'Desactivar' : 'Reactivar'}
              </button>
            </>
          )}
        </td>
      </tr>
      {err && <tr><td colSpan={5}><p className="error">{err}</p></td></tr>}
    </>
  );
}
