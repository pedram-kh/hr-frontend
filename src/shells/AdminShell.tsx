import { useState } from 'react';
import { useAuth } from '../auth/context';
import { ThemeToggle } from '../theme/ThemeToggle';
import { DocumentsPage } from '../pages/admin/DocumentsPage';
import { KnowledgeMapPage } from '../pages/admin/KnowledgeMapPage';
import { AnswerModelPage } from '../pages/admin/AnswerModelPage';

type View = 'documents' | 'map' | 'settings';

// Admin console shell. Sprint 1: Knowledge → Documents. Sprint 2b-1 adds
// Settings → Answer model (ADR-0015). Sprint 3 adds Knowledge → Map (the
// lens hierarchy + coverage gaps + the document card with bounded edit/sandbox).
export function AdminShell() {
  const { identity, logout } = useAuth();
  const [view, setView] = useState<View>('map');

  const navBtn = (id: View, label: string) => (
    <button className={`btn btn-ghost ${view === id ? 'active' : ''}`} onClick={() => setView(id)}>
      {label}
    </button>
  );

  return (
    <div className="shell">
      <header className="shell-header">
        <strong>HR Platform — Admin</strong>
        <nav className="shell-nav">
          {navBtn('map', 'Map')}
          {navBtn('documents', 'Documents')}
          {navBtn('settings', 'Settings')}
        </nav>
        <span className="muted">{identity?.email}</span>
        <ThemeToggle />
        <button className="btn btn-ghost" onClick={logout}>Log out</button>
      </header>
      <main className="shell-body shell-body--wide">
        {view === 'map' && (
          <>
            <h2>Knowledge · Map</h2>
            <p className="muted">Navigate the corpus by lens, spot coverage gaps, and open a document to inspect, test, or edit its labels.</p>
            <KnowledgeMapPage />
          </>
        )}
        {view === 'documents' && (
          <>
            <h2>Knowledge · Documents</h2>
            <p className="muted">Upload convenio folders, review auto-parsed tags, resolve conflicts, and confirm.</p>
            <DocumentsPage />
          </>
        )}
        {view === 'settings' && (
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
