import { useEffect, useState } from 'react';
import { useAuth } from '../auth/context';
import { canManageAdmins, canManageDirectory, canViewAllHistory, canViewAnalytics, canViewCoverage, canViewQuality } from '../lib/api';
import { parseAdminHash } from '../lib/adminHash';
import { ThemeToggle } from '../theme/ThemeToggle';
import { DocumentsPage } from '../pages/admin/DocumentsPage';
import { ReviewQueuePage } from '../pages/admin/ReviewQueuePage';
import { KnowledgeMapPage } from '../pages/admin/KnowledgeMapPage';
import { AnswerModelPage } from '../pages/admin/AnswerModelPage';
import { GuardrailsPage } from '../pages/admin/GuardrailsPage';
import { EscalationBoardPage } from '../pages/admin/EscalationBoardPage';
import { DirectoryPage } from '../pages/admin/DirectoryPage';
import { AdminsPage } from '../pages/admin/AdminsPage';
import { HistoryPage } from '../pages/admin/HistoryPage';
import { AnalyticsPage } from '../pages/admin/AnalyticsPage';
import { CoveragePage } from '../pages/admin/CoveragePage';
import { QualitySampleQueue } from '../pages/admin/QualitySampleQueue';

type View =
  | 'documents'
  | 'map'
  | 'review'
  | 'escalations'
  | 'directory'
  | 'admins'
  | 'history'
  | 'guardrails'
  | 'settings'
  | 'analytics'
  | 'coverage'
  | 'quality';

const VALID_VIEWS: readonly View[] = [
  'documents',
  'map',
  'review',
  'escalations',
  'directory',
  'admins',
  'history',
  'guardrails',
  'settings',
  'analytics',
  'coverage',
  'quality',
];

function isView(v: string | null): v is View {
  return v !== null && (VALID_VIEWS as readonly string[]).includes(v);
}

// Admin console shell. Sprint 1: Knowledge → Documents. Sprint 2b-1 adds
// Settings → Answer model (ADR-0015). Sprint 3 adds Knowledge → Map. Sprint 5
// adds the access-control surfaces — Directory (directory.manage), Admins
// (admin.manage) and History (history.view_all). Sprint 6 adds Seguridad →
// Guardarraíles (read open to admins; writes guardrails.manage / super_admin —
// ADR-0019). The nav only HIDES on these abilities; the server enforces each
// endpoint regardless (ADR-0018), and the Guardrails page gates its own write
// affordances on the server-provided can_manage.
export function AdminShell() {
  const { identity, logout } = useAuth();
  // Sprint 7g Item 2 (ADR-0029's fix_link scheme) — parsed at mount AND on
  // every `hashchange`. `EscalationExplainer`'s `fix_link` values render as
  // plain `<a href="#view=...">` anchors (Corregir, in `EscalationCardDrawer`)
  // — clicking one while the shell is ALREADY mounted only fires a
  // `hashchange` event (no page reload), so a mount-only read would silently
  // do nothing on click. Re-parsing here + a `key` on the affected pages
  // (below) forces them to remount with the fresh initial selection, which
  // keeps every child's own state a plain one-shot `useState` initializer
  // (same posture as the pre-existing `#doc=` pattern) instead of turning
  // this into a live router.
  const [hash, setHash] = useState(() => parseAdminHash());
  useEffect(() => {
    const onHashChange = () => setHash(parseAdminHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Sprint 7e verification fix (review.md §2): a `#doc=<uuid>` deep link
  // (read/written by DocumentsPage) targets a card that only lives on the
  // Documents view — land there on first render instead of the Map default
  // so the link actually opens something. DocumentsPage itself reads the
  // uuid back out of the hash; this only decides which tab is initially shown.
  //
  // Sprint 7g Item 2 extends this: an explicit `#view=<view>` (written by
  // EscalationExplainer's fix_link values, e.g. `#view=review&tab=groups...`)
  // takes priority when present; the bare `doc=` compat form is still checked
  // for old links that never carried a `view=` key at all. Follows `hash`
  // (not just the initial value) so a Corregir click actually switches tabs.
  const [view, setView] = useState<View>(() => {
    if (isView(hash.view)) return hash.view;

    return window.location.hash.includes('doc=') ? 'documents' : 'map';
  });
  useEffect(() => {
    if (isView(hash.view)) setView(hash.view);
  }, [hash]);
  // Deep-link from a Knowledge-Center ruling card back to its escalation card.
  const [escalationFocus, setEscalationFocus] = useState<string | null>(null);

  const showDirectory = canManageDirectory(identity);
  const showAdmins = canManageAdmins(identity);
  const showHistory = canViewAllHistory(identity);
  const showAnalytics = canViewAnalytics(identity);
  const showCoverage = canViewCoverage(identity);
  const showQuality = canViewQuality(identity);

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
          {navBtn('review', 'Review')}
          {navBtn('escalations', 'Escalations')}
          {showAnalytics && navBtn('analytics', 'Analítica')}
          {showCoverage && navBtn('coverage', 'Cobertura')}
          {showQuality && navBtn('quality', 'Calidad')}
          {showDirectory && navBtn('directory', 'Directory')}
          {showHistory && navBtn('history', 'History')}
          {showAdmins && navBtn('admins', 'Admins')}
          {navBtn('guardrails', 'Guardrails')}
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
        {view === 'review' && (
          <>
            <h2>Knowledge · Review</h2>
            <p className="muted">The messy-tail queues: AI tagging proposals to verify, vocabulary proposals to approve, and documents nearing expiry to succeed. Fuchsia marks unverified-AI content.</p>
            <ReviewQueuePage
              key={`${hash.tab ?? ''}|${hash.fact ?? ''}|${hash.convenio ?? ''}`}
              initialTab={hash.tab}
              initialFactUuid={hash.fact}
              initialConvenioId={hash.convenio}
            />
          </>
        )}
        {view === 'escalations' && (
          <>
            <h2>Knowledge · Escalations</h2>
            <p className="muted">Triage escalated questions: assign, reply to the employee, and resolve — optionally publishing the answer as reusable knowledge.</p>
            <EscalationBoardPage focusUuid={escalationFocus} onFocusHandled={() => setEscalationFocus(null)} />
          </>
        )}
        {view === 'analytics' && showAnalytics && (
          <>
            <h2>Analítica</h2>
            <p className="muted">Deflection, escalaciones por corrección y agrupación de preguntas — todo reproducible desde los comandos <code>stats:*</code>/<code>questions:cluster</code>.</p>
            <AnalyticsPage />
          </>
        )}
        {view === 'coverage' && showCoverage && (
          <>
            <h2>Cobertura</h2>
            <p className="muted">La rejilla convenio × (prosa, salario, datos, resoluciones) — la misma consulta que <code>corpus:coverage</code>.</p>
            <CoveragePage />
          </>
        )}
        {view === 'quality' && showQuality && (
          <>
            <h2>Calidad</h2>
            <p className="muted">Muestra mensual estratificada de turnos respondidos (<code>quality:sample</code>). Lectura abierta a cualquier admin; marcar una muestra requiere <code>escalation.work</code>.</p>
            <QualitySampleQueue />
          </>
        )}
        {view === 'directory' && showDirectory && (
          <>
            <h2>Personas · Directorio</h2>
            <p className="muted">Gestiona el alta y los datos de las personas (convenio, territorio, categoría). Cada cambio queda auditado; importa en bloque por CSV.</p>
            <DirectoryPage key={hash.emp ?? ''} initialEmployeeUuid={hash.emp} />
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
        {view === 'guardrails' && (
          <>
            <h2>Seguridad · Guardarraíles</h2>
            <p className="muted">
              Ajusta la capa configurable sobre la base de seguridad fija. Solo puede endurecer,
              nunca debilitar: el servidor aplica siempre el valor más estricto y rechaza cualquier valor por
              debajo del mínimo. Escritura solo para super_admin; auditor en solo lectura.
            </p>
            <GuardrailsPage />
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
