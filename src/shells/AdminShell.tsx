import { useState } from 'react';
import { useAuth } from '../auth/context';
import { DocumentsPage } from '../pages/admin/DocumentsPage';

type View = 'home' | 'documents';

// Admin console shell. Sprint 1 adds the Knowledge → Documents module
// (ingestion + tag verification); other modules arrive in later sprints.
export function AdminShell() {
  const { identity, logout } = useAuth();
  const [view, setView] = useState<View>('documents');

  return (
    <div className="shell">
      <header className="shell-header">
        <strong>HR Platform — Admin</strong>
        <nav className="shell-nav">
          <button className={`link ${view === 'documents' ? 'active' : ''}`} onClick={() => setView('documents')}>
            Knowledge
          </button>
        </nav>
        <span className="muted">{identity?.email}</span>
        <button className="link" onClick={logout}>Log out</button>
      </header>
      <main className="shell-body shell-body--wide">
        {view === 'documents' ? (
          <>
            <h2>Knowledge · Documents</h2>
            <p className="muted">Upload convenio folders, review auto-parsed tags, resolve conflicts, and confirm.</p>
            <DocumentsPage />
          </>
        ) : (
          <h2>Welcome, {identity?.full_name}</h2>
        )}
      </main>
    </div>
  );
}
