import { useState } from 'react';
import { useAuth } from '../auth/context';
import { ThemeToggle } from '../theme/ThemeToggle';
import { DocumentsPage } from '../pages/admin/DocumentsPage';
import { AnswerModelPage } from '../pages/admin/AnswerModelPage';

type View = 'documents' | 'settings';

// Admin console shell. Sprint 1: Knowledge → Documents. Sprint 2b-1 adds
// Settings → Answer model (the external-provider key screen, ADR-0015).
export function AdminShell() {
  const { identity, logout } = useAuth();
  const [view, setView] = useState<View>('documents');

  return (
    <div className="shell">
      <header className="shell-header">
        <strong>HR Platform — Admin</strong>
        <nav className="shell-nav">
          <button
            className={`btn btn-ghost ${view === 'documents' ? 'active' : ''}`}
            onClick={() => setView('documents')}
          >
            Knowledge
          </button>
          <button
            className={`btn btn-ghost ${view === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
          >
            Settings
          </button>
        </nav>
        <span className="muted">{identity?.email}</span>
        <ThemeToggle />
        <button className="btn btn-ghost" onClick={logout}>Log out</button>
      </header>
      <main className="shell-body shell-body--wide">
        {view === 'documents' ? (
          <>
            <h2>Knowledge · Documents</h2>
            <p className="muted">Upload convenio folders, review auto-parsed tags, resolve conflicts, and confirm.</p>
            <DocumentsPage />
          </>
        ) : (
          <>
            <h2>Settings · Answer model</h2>
            <p className="muted">Configure the external answer-model provider key (ADR-0015).</p>
            <AnswerModelPage />
          </>
        )}
      </main>
    </div>
  );
}
