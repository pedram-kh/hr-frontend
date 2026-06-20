import { useAuth } from '../auth/context';

// Empty admin console shell (Sprint 0). No console modules — just proves auth + /me.
export function AdminShell() {
  const { identity, logout } = useAuth();

  return (
    <div className="shell">
      <header className="shell-header">
        <strong>HR Platform — Admin</strong>
        <span className="muted">{identity?.email}</span>
        <button className="link" onClick={logout}>
          Log out
        </button>
      </header>
      <main className="shell-body">
        <h2>Welcome, {identity?.full_name}</h2>
        <p className="muted">This is the (empty) admin console shell. Modules arrive in later sprints.</p>
        <h3>Roles</h3>
        <ul>
          {(identity?.roles ?? []).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </main>
    </div>
  );
}
