import { useState } from 'react';
import { useAuth } from '../auth/context';
import { canManageAdmins, canManageDirectory, canViewAllHistory } from '../lib/api';
import { ThemeToggle } from '../theme/ThemeToggle';
import { DocumentsPage } from '../pages/admin/DocumentsPage';
import { KnowledgeMapPage } from '../pages/admin/KnowledgeMapPage';
import { AnswerModelPage } from '../pages/admin/AnswerModelPage';
import { EscalationBoardPage } from '../pages/admin/EscalationBoardPage';
import { DirectoryPage } from '../pages/admin/DirectoryPage';
import { AdminsPage } from '../pages/admin/AdminsPage';
import { HistoryPage } from '../pages/admin/HistoryPage';

type View = 'documents' | 'map' | 'escalations' | 'directory' | 'admins' | 'history' | 'settings';

// Admin console shell. Sprint 1: Knowledge → Documents. Sprint 2b-1 adds
// Settings → Answer model (ADR-0015). Sprint 3 adds Knowledge → Map. Sprint 5
// adds the access-control surfaces — Directory (directory.manage), Admins
// (admin.manage) and History (history.view_all). The nav only HIDES on these
// abilities; the server enforces each endpoint regardless (ADR-0018).
export function AdminShell() {
  const { identity, logout } = useAuth();
  const [view, setView] = useState<View>('map');
  // Deep-link from a Knowledge-Center ruling card back to its escalation card.
  const [escalationFocus, setEscalationFocus] = useState<string | null>(null);

  const showDirectory = canManageDirectory(identity);
  const showAdmins = canManageAdmins(identity);
  const showHistory = canViewAllHistory(identity);

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
          {showDirectory && navBtn('directory', 'Directory')}
          {showHistory && navBtn('history', 'History')}
          {showAdmins && navBtn('admins', 'Admins')}
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
        {view === 'directory' && showDirectory && (
          <>
            <h2>Personas · Directorio</h2>
            <p className="muted">Gestiona el alta y los datos de las personas (convenio, territorio, categoría). Cada cambio queda auditado; importa en bloque por CSV.</p>
            <DirectoryPage />
          </>
        )}
        {view === 'history' && showHistory && (
          <>
            <h2>Personas · Histórico de conversaciones</h2>
            <p className="muted">Consulta y busca las conversaciones de toda la organización (solo lectura). Cada apertura queda registrada en el registro de accesos.</p>
            <HistoryPage />
          </>
        )}
        {view === 'admins' && showAdmins && (
          <>
            <h2>Administración · Administradores y roles</h2>
            <p className="muted">Crea administradores, asigna los cuatro roles y desactiva cuentas (la desactivación retira el acceso de inmediato).</p>
            <AdminsPage />
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
