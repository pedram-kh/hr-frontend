import { useState } from 'react';
import { useAuth } from '../auth/context';
import { ThemeToggle } from '../theme/ThemeToggle';
import { DocumentsPage } from '../pages/admin/DocumentsPage';
import { KnowledgeMapPage } from '../pages/admin/KnowledgeMapPage';
import { AnswerModelPage } from '../pages/admin/AnswerModelPage';
import { EscalationBoardPage } from '../pages/admin/EscalationBoardPage';

type View = 'documents' | 'map' | 'escalations' | 'settings';

// Admin console shell. Sprint 1: Knowledge → Documents. Sprint 2b-1 adds
// Settings → Answer model (ADR-0015). Sprint 3 adds Knowledge → Map (the
// lens hierarchy + coverage gaps + the document card with bounded edit/sandbox).
export function AdminShell() {
  const { identity, logout } = useAuth();
  const [view, setView] = useState<View>('map');
  // Deep-link from a Knowledge-Center ruling card back to its escalation card.
  const [escalationFocus, setEscalationFocus] = useState<string | null>(null);

  const openEscalation = (uuid: string) => {
    setEscalationFocus(uuid);
    setView('escalations');
  };

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
          {navBtn('escalations', 'Escalations')}
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
            <KnowledgeMapPage onOpenEscalation={openEscalation} />
          </>
        )}
        {view === 'documents' && (
          <>
            <h2>Knowledge · Documents</h2>
            <p className="muted">Upload convenio folders, review auto-parsed tags, resolve conflicts, and confirm.</p>
            <DocumentsPage />
          </>
        )}
        {view === 'escalations' && (
          <>
            <h2>Knowledge · Escalations</h2>
            <p className="muted">Triage escalated questions: assign, reply to the employee, and resolve — optionally publishing the answer as reusable knowledge.</p>
            <EscalationBoardPage focusUuid={escalationFocus} onFocusHandled={() => setEscalationFocus(null)} />
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
