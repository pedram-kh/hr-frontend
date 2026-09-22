import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Map as MapIcon,
  FileText,
  ClipboardCheck,
  AlertTriangle,
  History as HistoryIcon,
  BarChart3,
  Grid3x3,
  BadgeCheck,
  Users,
  UserCog,
  Shield,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeftOpen,
  CircleUserRound,
  LogOut,
  Menu,
} from 'lucide-react';
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
import { BrandPreviewPage } from '../pages/admin/BrandPreviewPage';
import { BRAND } from '../theme/brand';

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
  | 'quality'
  | 'brand-preview';

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
  // Sprint 11a CP-1 (§G.1 step 3): deliberately reachable ONLY via
  // #view=brand-preview — never rendered in the <nav> below, so it can't
  // leak into production nav before approval.
  'brand-preview',
];

function isView(v: string | null): v is View {
  return v !== null && (VALID_VIEWS as readonly string[]).includes(v);
}

// Sprint 11a CP-2 revision (§B.2) — sidebar collapse is a pure UI-layout
// preference, unrelated to ThemeProvider's deliberate no-persistence stance
// (design-system §6, theme itself). Wrapped in try/catch: private-browsing
// storage restrictions must never break the shell.
const SIDEBAR_COLLAPSED_KEY = 'hr-admin-sidebar-collapsed';

function initialSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
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

  // Sprint 11a CP-2 revision (§B.2) — sidebar collapse, persisted across visits.
  const [collapsed, setCollapsed] = useState<boolean>(initialSidebarCollapsed);
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      // best-effort only — a failed write never blocks toggling the sidebar itself.
    }
  }, [collapsed]);

  // Sprint 11c (§E.1 scope addition) — mobile: the sidebar overlays the
  // content via a hamburger instead of consuming the screen. Unrelated to
  // `collapsed` (desktop's persisted icon-rail preference): below the mobile
  // breakpoint the sidebar is off-canvas by default regardless of
  // `collapsed`, and while open it always renders full-width/full-text (the
  // `--collapsed` class is simply omitted below), never the icon rail.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  // `groupLabel` (Sprint 11a CP-2 revision, §B.2) feeds the collapsed-sidebar
  // tooltip/aria-label ("Atención · Escalaciones" style) — the only signal a
  // screen reader or a collapsed hover gets once the visible text label hides.
  const navBtn = (id: View, groupLabel: string, label: string, Icon: LucideIcon) => {
    const fullLabel = `${groupLabel} · ${label}`;
    return (
      <button
        key={id}
        className={`btn btn-ghost shell-nav-item ${view === id ? 'active' : ''}`}
        onClick={() => {
          setView(id);
          setMobileNavOpen(false); // a selection is also the mobile drawer's dismissal
        }}
        aria-label={fullLabel}
        data-tooltip={fullLabel}
      >
        <Icon size={16} aria-hidden="true" />
        <span className="shell-sidebar-text">{label}</span>
      </button>
    );
  };

  // Sprint 11a (§B.2), revised CP-2 (sidebar layout, same grouping/gating):
  // five labeled sub-groups, same view/hash-routing state machine untouched —
  // only the JSX/CSS around it changed (top bar → left sidebar). A group
  // with zero visible items renders nothing at all (no orphan header) rather
  // than an empty wrapper; only "Personas" can ever be fully absent, since
  // every other group has at least one nav-unconditional item (§B.3's
  // per-role snapshot test asserts this precisely).
  const conocimiento = [
    navBtn('map', 'Conocimiento', 'Mapa', MapIcon),
    navBtn('documents', 'Conocimiento', 'Documentos', FileText),
    navBtn('review', 'Conocimiento', 'Revisión', ClipboardCheck),
  ];
  const atencion = [
    navBtn('escalations', 'Atención', 'Escalaciones', AlertTriangle),
    showHistory && navBtn('history', 'Atención', 'Historial', HistoryIcon),
  ].filter(Boolean);
  const analisis = [
    showAnalytics && navBtn('analytics', 'Análisis', 'Analítica', BarChart3),
    showCoverage && navBtn('coverage', 'Análisis', 'Cobertura', Grid3x3),
    showQuality && navBtn('quality', 'Análisis', 'Calidad', BadgeCheck),
  ].filter(Boolean);
  const personas = [
    showDirectory && navBtn('directory', 'Personas', 'Directorio', Users),
    showAdmins && navBtn('admins', 'Personas', 'Administradores', UserCog),
  ].filter(Boolean);
  const gobierno = [navBtn('guardrails', 'Gobierno', 'Guardrails', Shield), navBtn('settings', 'Gobierno', 'Ajustes', SettingsIcon)];

  const navGroup = (label: string, items: ReactNode[]) =>
    items.length > 0 && (
      <div className="shell-nav-group" key={label}>
        <span className="shell-nav-group-label shell-sidebar-text">{label}</span>
        {items}
      </div>
    );

  return (
    <div className="shell shell--with-sidebar">
      {mobileNavOpen && (
        <div className="shell-sidebar-backdrop" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
      )}
      <aside
        className={`shell-sidebar ${collapsed && !mobileNavOpen ? 'shell-sidebar--collapsed' : ''} ${
          mobileNavOpen ? 'shell-sidebar--mobile-open' : ''
        }`}
      >
        <div className="shell-sidebar-header">
          {/* `logo.svg` is a full wordmark (~4.86:1), not a square icon — sized
              by its natural aspect ratio, not a fixed box. It already reads
              the product name visually, so `BRAND.productName` (from
              brand.ts) becomes its accessible `alt` rather than a second,
              separately-visible label next to it (a generic "HR Platform"
              string beside a specific brand wordmark would read as two
              different names). Flagged for CP-2 review — see review.md. */}
          <img src={BRAND.logo} alt={BRAND.productName} className="shell-sidebar-logo" />
          <button
            type="button"
            className="btn btn-ghost shell-sidebar-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            aria-expanded={!collapsed}
            data-tooltip={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? <PanelLeftOpen size={16} aria-hidden="true" /> : <PanelLeftClose size={16} aria-hidden="true" />}
          </button>
        </div>
        <nav className="shell-nav shell-nav--sidebar">
          {navGroup('Conocimiento', conocimiento)}
          {navGroup('Atención', atencion)}
          {navGroup('Análisis', analisis)}
          {navGroup('Personas', personas)}
          {navGroup('Gobierno', gobierno)}
        </nav>
        <div className="shell-sidebar-footer">
          <div className="shell-sidebar-user" data-tooltip={identity?.email ?? ''}>
            <CircleUserRound size={16} aria-hidden="true" />
            <span className="shell-sidebar-text muted">{identity?.email}</span>
          </div>
          <ThemeToggle className="shell-nav-item" />
          <button
            type="button"
            className="btn btn-ghost shell-nav-item"
            onClick={logout}
            aria-label="Log out"
            data-tooltip="Log out"
          >
            <LogOut size={16} aria-hidden="true" />
            <span className="shell-sidebar-text">Log out</span>
          </button>
        </div>
      </aside>
      <main className="shell-body shell-body--wide">
        <button
          type="button"
          className="btn btn-ghost shell-mobile-nav-btn"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        {view === 'map' && (
          <>
            <h2>Conocimiento · Mapa</h2>
            <p className="muted">Navigate the corpus by lens, spot coverage gaps, and open a document to inspect, test, or edit its labels.</p>
            <KnowledgeMapPage key={hash.tab ?? ''} onOpenEscalation={openEscalation} initialTab={hash.tab} />
          </>
        )}
        {view === 'documents' && (
          <>
            <h2>Conocimiento · Documentos</h2>
            <p className="muted">Upload convenio folders, review auto-parsed tags, resolve conflicts, and confirm.</p>
            <DocumentsPage key={hash.convenio ?? ''} initialConvenioId={hash.convenio} />
          </>
        )}
        {view === 'review' && (
          <>
            <h2>Conocimiento · Revisión</h2>
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
            <h2>Atención · Escalaciones</h2>
            <p className="muted">Triage escalated questions: assign, reply to the employee, and resolve — optionally publishing the answer as reusable knowledge.</p>
            <EscalationBoardPage focusUuid={escalationFocus} onFocusHandled={() => setEscalationFocus(null)} />
          </>
        )}
        {view === 'analytics' && showAnalytics && (
          <>
            <h2>Análisis · Analítica</h2>
            <p className="muted">Deflection, escalaciones por corrección y agrupación de preguntas — todo reproducible desde los comandos <code>stats:*</code>/<code>questions:cluster</code>.</p>
            <AnalyticsPage />
          </>
        )}
        {view === 'coverage' && showCoverage && (
          <>
            <h2>Análisis · Cobertura</h2>
            <p className="muted">La rejilla convenio × (prosa, salario, datos, resoluciones) — la misma consulta que <code>corpus:coverage</code>.</p>
            <CoveragePage />
          </>
        )}
        {view === 'quality' && showQuality && (
          <>
            <h2>Análisis · Calidad</h2>
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
            <h2>Atención · Histórico de conversaciones</h2>
            <p className="muted">Consulta y busca las conversaciones de toda la organización (solo lectura). Cada apertura queda registrada en el registro de accesos.</p>
            <HistoryPage />
          </>
        )}
        {view === 'admins' && showAdmins && (
          <>
            <h2>Personas · Administradores y roles</h2>
            <p className="muted">Crea administradores, asigna los cuatro roles y desactiva cuentas (la desactivación retira el acceso de inmediato).</p>
            <AdminsPage />
          </>
        )}
        {view === 'guardrails' && (
          <>
            <h2>Gobierno · Guardarraíles</h2>
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
            <h2>Gobierno · Answer model</h2>
            <p className="muted">Configure the external answer-model provider key (ADR-0015).</p>
            <AnswerModelPage />
          </>
        )}
        {view === 'brand-preview' && (
          <>
            <h2>Brand preview (CP-1 — sprint-11a)</h2>
            <p className="muted">Not in the nav — reachable only via #view=brand-preview. See sprint-11a/plan.md §G.1 step 3.</p>
            <BrandPreviewPage />
          </>
        )}
      </main>
    </div>
  );
}
