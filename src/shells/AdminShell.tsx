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
import { LocaleToggle } from '../i18n/LocaleToggle';
import { useT } from '../i18n/context';
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
  // Sprint 11b (plan.md §C.9 step 4 — CP-1 slice: this file's full extraction).
  const t = useT();
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
    navBtn('map', t.adminShell.groups.conocimiento, t.adminShell.nav.mapa, MapIcon),
    navBtn('documents', t.adminShell.groups.conocimiento, t.adminShell.nav.documentos, FileText),
    navBtn('review', t.adminShell.groups.conocimiento, t.adminShell.nav.revision, ClipboardCheck),
  ];
  const atencion = [
    navBtn('escalations', t.adminShell.groups.atencion, t.adminShell.nav.escalaciones, AlertTriangle),
    showHistory && navBtn('history', t.adminShell.groups.atencion, t.adminShell.nav.historial, HistoryIcon),
  ].filter(Boolean);
  const analisis = [
    showAnalytics && navBtn('analytics', t.adminShell.groups.analisis, t.adminShell.nav.analitica, BarChart3),
    showCoverage && navBtn('coverage', t.adminShell.groups.analisis, t.adminShell.nav.cobertura, Grid3x3),
    showQuality && navBtn('quality', t.adminShell.groups.analisis, t.adminShell.nav.calidad, BadgeCheck),
  ].filter(Boolean);
  const personas = [
    showDirectory && navBtn('directory', t.adminShell.groups.personas, t.adminShell.nav.directorio, Users),
    showAdmins && navBtn('admins', t.adminShell.groups.personas, t.adminShell.nav.administradores, UserCog),
  ].filter(Boolean);
  const gobierno = [
    navBtn('guardrails', t.adminShell.groups.gobierno, t.adminShell.nav.guardrails, Shield),
    navBtn('settings', t.adminShell.groups.gobierno, t.adminShell.nav.ajustes, SettingsIcon),
  ];

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
          <img src={BRAND.logo} alt={t.brand.productName} className="shell-sidebar-logo" />
          <button
            type="button"
            className="btn btn-ghost shell-sidebar-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? t.adminShell.expandMenu : t.adminShell.collapseMenu}
            aria-expanded={!collapsed}
            data-tooltip={collapsed ? t.adminShell.expandMenu : t.adminShell.collapseMenu}
          >
            {collapsed ? <PanelLeftOpen size={16} aria-hidden="true" /> : <PanelLeftClose size={16} aria-hidden="true" />}
          </button>
        </div>
        <nav className="shell-nav shell-nav--sidebar">
          {navGroup(t.adminShell.groups.conocimiento, conocimiento)}
          {navGroup(t.adminShell.groups.atencion, atencion)}
          {navGroup(t.adminShell.groups.analisis, analisis)}
          {navGroup(t.adminShell.groups.personas, personas)}
          {navGroup(t.adminShell.groups.gobierno, gobierno)}
        </nav>
        <div className="shell-sidebar-footer">
          <div className="shell-sidebar-user" data-tooltip={identity?.email ?? ''}>
            <CircleUserRound size={16} aria-hidden="true" />
            <span className="shell-sidebar-text muted">{identity?.email}</span>
          </div>
          <ThemeToggle className="shell-nav-item" />
          <LocaleToggle className="shell-nav-item" />
          <button
            type="button"
            className="btn btn-ghost shell-nav-item"
            onClick={logout}
            aria-label={t.adminShell.logout}
            data-tooltip={t.adminShell.logout}
          >
            <LogOut size={16} aria-hidden="true" />
            <span className="shell-sidebar-text">{t.adminShell.logout}</span>
          </button>
        </div>
      </aside>
      <main className="shell-body shell-body--wide">
        <button
          type="button"
          className="btn btn-ghost shell-mobile-nav-btn"
          onClick={() => setMobileNavOpen(true)}
          aria-label={t.adminShell.openMobileMenu}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        {view === 'map' && (
          <>
            <h2>{t.adminShell.views.map.heading}</h2>
            <p className="muted">{t.adminShell.views.map.description}</p>
            <KnowledgeMapPage key={hash.tab ?? ''} onOpenEscalation={openEscalation} initialTab={hash.tab} />
          </>
        )}
        {view === 'documents' && (
          <>
            <h2>{t.adminShell.views.documents.heading}</h2>
            <p className="muted">{t.adminShell.views.documents.description}</p>
            <DocumentsPage key={hash.convenio ?? ''} initialConvenioId={hash.convenio} />
          </>
        )}
        {view === 'review' && (
          <>
            <h2>{t.adminShell.views.review.heading}</h2>
            <p className="muted">{t.adminShell.views.review.description}</p>
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
            <h2>{t.adminShell.views.escalations.heading}</h2>
            <p className="muted">{t.adminShell.views.escalations.description}</p>
            <EscalationBoardPage focusUuid={escalationFocus} onFocusHandled={() => setEscalationFocus(null)} />
          </>
        )}
        {view === 'analytics' && showAnalytics && (
          <>
            <h2>{t.adminShell.views.analytics.heading}</h2>
            {/* `stats:*`/`questions:cluster` are real CLI command names, invariant
                across locale — left as literal `<code>` text, not run through
                `t()` (plan.md §B.6's "technical string" allowlist category). */}
            <p className="muted">{t.adminShell.views.analytics.description} <code>stats:*</code>/<code>questions:cluster</code>.</p>
            <AnalyticsPage />
          </>
        )}
        {view === 'coverage' && showCoverage && (
          <>
            <h2>{t.adminShell.views.coverage.heading}</h2>
            <p className="muted">{t.adminShell.views.coverage.description} <code>corpus:coverage</code>.</p>
            <CoveragePage />
          </>
        )}
        {view === 'quality' && showQuality && (
          <>
            <h2>{t.adminShell.views.quality.heading}</h2>
            <p className="muted">
              {t.adminShell.views.quality.descriptionBeforeCode}<code>quality:sample</code>
              {t.adminShell.views.quality.descriptionBetweenCodes} <code>escalation.work</code>.
            </p>
            <QualitySampleQueue />
          </>
        )}
        {view === 'directory' && showDirectory && (
          <>
            <h2>{t.adminShell.views.directory.heading}</h2>
            <p className="muted">{t.adminShell.views.directory.description}</p>
            <DirectoryPage key={hash.emp ?? ''} initialEmployeeUuid={hash.emp} />
          </>
        )}
        {view === 'history' && showHistory && (
          <>
            <h2>{t.adminShell.views.history.heading}</h2>
            <p className="muted">{t.adminShell.views.history.description}</p>
            <HistoryPage />
          </>
        )}
        {view === 'admins' && showAdmins && (
          <>
            <h2>{t.adminShell.views.admins.heading}</h2>
            <p className="muted">{t.adminShell.views.admins.description}</p>
            <AdminsPage />
          </>
        )}
        {view === 'guardrails' && (
          <>
            <h2>{t.adminShell.views.guardrails.heading}</h2>
            <p className="muted">{t.adminShell.views.guardrails.description}</p>
            <GuardrailsPage />
          </>
        )}
        {view === 'settings' && (
          <>
            <h2>{t.adminShell.views.settings.heading}</h2>
            <p className="muted">{t.adminShell.views.settings.description}</p>
            <AnswerModelPage />
          </>
        )}
        {view === 'brand-preview' && (
          <>
            <h2>{t.adminShell.views.brandPreview.heading}</h2>
            <p className="muted">{t.adminShell.views.brandPreview.description}</p>
            <BrandPreviewPage />
          </>
        )}
      </main>
    </div>
  );
}
