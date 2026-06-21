import { useAuth } from '../auth/context';
import { ThemeToggle } from '../theme/ThemeToggle';

// Empty employee chat shell (Sprint 0). No chat logic — just proves auth + /me.
export function EmployeeShell() {
  const { identity, logout } = useAuth();
  const profile = identity?.profile;

  return (
    <div className="shell">
      <header className="shell-header">
        <strong>HR Platform — Chat</strong>
        <span className="muted">{identity?.email}</span>
        <ThemeToggle />
        <button className="btn btn-ghost" onClick={logout}>
          Log out
        </button>
      </header>
      <main className="shell-body">
        <h2>Welcome, {identity?.full_name}</h2>
        <p className="muted">This is the (empty) employee chat shell. Chat arrives in a later sprint.</p>
        <h3>Your resolved profile</h3>
        <ul>
          <li>Convenio: {profile?.convenio?.name ?? '—'} ({profile?.convenio?.numero ?? '—'})</li>
          <li>Territory: {profile?.territory?.name ?? '—'} ({profile?.territory?.code ?? '—'})</li>
          <li>Job category: {profile?.job_category?.name ?? '—'}</li>
          <li>Employment type: {profile?.employment_type ?? '—'}</li>
        </ul>
      </main>
    </div>
  );
}
