// @vitest-environment jsdom
//
// Sprint 11a (§B.3) — the frontend-side complement to
// Sprint8AnalyticsAccessTest.php (which guards the backend's *payload*).
// This guards the *rendered* nav: exact group→item visibility, per role.
// Would have caught the Sprint 8 nav-key bug (§B.1) from the rendering side
// if it had existed then.
//
// Role fixtures are the real grants from `RoleSeeder.php`, not invented:
//   super_admin:      all 8 abilities
//   hr_agent:         escalation.work, directory.manage, analytics.view
//   knowledge_editor: knowledge.edit only
//   auditor:          history.view_all, analytics.view
//
// One correction to the plan's own illustrative example (§B.3): it shows
// knowledge_editor's "Análisis" group as [Cobertura] only, omitting
// "Calidad". `canViewQuality()` (`lib/api.ts`) is unconditional for any
// logged-in admin, so Calidad is visible to every role below — verified
// against the real function, not copied from the plan's shorthand.
//
// CP-2 revision: the nav moved from a top bar into a collapsible left
// sidebar (JSX/CSS relocation only — same View union, same hash routing,
// same ability gating, confirmed by this file's group→item assertions being
// otherwise unchanged). Added: collapsed-mode assertions for the
// "Group · Item" aria-labels every item carries regardless of collapse state
// (jsdom does not apply `index.css`, so visibility itself isn't asserted
// here — only the structural pieces: the `.shell-sidebar--collapsed`
// modifier class and every item's accessible name).
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../auth/context';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import type { Identity } from '../../lib/api';
import { AdminShell } from '../AdminShell';

function identityWith(abilities: Record<string, boolean>): Identity {
  return {
    account_type: 'admin',
    uuid: 'test-uuid',
    email: 'test@hr-staging.internal',
    full_name: 'Test Admin',
    status: 'active',
    abilities,
  };
}

const ROLES: Record<string, Identity> = {
  super_admin: identityWith({
    'knowledge.edit': true,
    'escalation.work': true,
    'history.view_all': true,
    'directory.manage': true,
    'admin.manage': true,
    'guardrails.manage': true,
    'vocabulary.approve': true,
    'analytics.view': true,
  }),
  hr_agent: identityWith({
    'escalation.work': true,
    'directory.manage': true,
    'analytics.view': true,
  }),
  knowledge_editor: identityWith({
    'knowledge.edit': true,
  }),
  auditor: identityWith({
    'history.view_all': true,
    'analytics.view': true,
  }),
};

// group label -> expected visible item labels, in render order
type Expected = Record<string, string[]>;

const EXPECTED: Record<string, Expected> = {
  super_admin: {
    Conocimiento: ['Mapa', 'Documentos', 'Revisión'],
    Atención: ['Escalaciones', 'Historial'],
    Análisis: ['Analítica', 'Cobertura', 'Calidad'],
    Personas: ['Directorio', 'Administradores'],
    Gobierno: ['Guardrails', 'Ajustes'],
  },
  hr_agent: {
    Conocimiento: ['Mapa', 'Documentos', 'Revisión'],
    Atención: ['Escalaciones'],
    Análisis: ['Analítica', 'Cobertura', 'Calidad'],
    Personas: ['Directorio'],
    Gobierno: ['Guardrails', 'Ajustes'],
  },
  knowledge_editor: {
    Conocimiento: ['Mapa', 'Documentos', 'Revisión'],
    Atención: ['Escalaciones'],
    Análisis: ['Cobertura', 'Calidad'],
    // Personas intentionally absent — deliberately no key here.
    Gobierno: ['Guardrails', 'Ajustes'],
  },
  auditor: {
    Conocimiento: ['Mapa', 'Documentos', 'Revisión'],
    Atención: ['Escalaciones', 'Historial'],
    Análisis: ['Analítica', 'Cobertura', 'Calidad'],
    // Personas intentionally absent.
    Gobierno: ['Guardrails', 'Ajustes'],
  },
};

// Same key AdminShell.tsx uses (`SIDEBAR_COLLAPSED_KEY`, not exported —
// duplicated here deliberately, same convention as the ability-name string
// literals in ROLES above).
const SIDEBAR_COLLAPSED_KEY = 'hr-admin-sidebar-collapsed';

function renderedGroups(): Record<string, string[]> {
  // Scoped by class, not role: a child page rendered under the default 'map'
  // view (KnowledgeMapPage) also renders its own <nav>, making
  // getByRole('navigation') ambiguous. `.shell-nav` is the admin shell's own
  // sidebar nav, unambiguous by construction (rendered exactly once).
  const nav = document.querySelector('.shell-nav');
  if (!nav) throw new Error('`.shell-nav` not found in the rendered output');
  const groups: Record<string, string[]> = {};
  nav.querySelectorAll('.shell-nav-group').forEach((el) => {
    const label = el.querySelector('.shell-nav-group-label')?.textContent ?? '';
    const items = Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');
    groups[label] = items;
  });
  return groups;
}

describe('AdminShell nav — per-role grouping (Sprint 11a §B.3)', () => {
  beforeEach(() => {
    // The nav assertions don't depend on any page's data; stub fetch so the
    // 'map' view's child components fail fast and quietly instead of trying
    // real network calls against a fake base URL.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network calls are not mocked in this nav-only test'))),
    );
    // Default expanded (AdminShell's own default when the key is absent) —
    // a test that wants collapsed sets this explicitly before rendering.
    window.localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
  });

  // No global RTL setup file in this project (only one prior test, a plain
  // .ts unit test with no DOM) — without this, each render() below leaves
  // its container in the DOM, so the NEXT test's `.shell-nav` query would
  // find the FIRST test's stale nav instead of its own.
  afterEach(() => {
    cleanup();
    window.localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
  });

  for (const [role, identity] of Object.entries(ROLES)) {
    it(`renders the correct group→item structure for ${role}`, () => {
      render(
        <LocaleProvider>
        <ThemeProvider>
          <AuthContext.Provider value={{ identity, loading: false, login: vi.fn(), logout: vi.fn() }}>
            <AdminShell />
          </AuthContext.Provider>
        </ThemeProvider>
        </LocaleProvider>,
      );

      expect(renderedGroups()).toEqual(EXPECTED[role]);
    });
  }

  it('never renders "brand-preview" in the visible nav for any role (CP-1 §G.1 step 3)', () => {
    render(
      <LocaleProvider>
        <ThemeProvider>
          <AuthContext.Provider value={{ identity: ROLES.super_admin, loading: false, login: vi.fn(), logout: vi.fn() }}>
            <AdminShell />
          </AuthContext.Provider>
        </ThemeProvider>
      </LocaleProvider>,
    );
    expect(screen.queryByText(/brand.preview/i)).not.toBeInTheDocument();
  });

  describe('collapsible sidebar (Sprint 11a CP-2 revision, §B.2)', () => {
    it('defaults to expanded (no persisted choice)', () => {
      render(
        <LocaleProvider>
        <ThemeProvider>
          <AuthContext.Provider value={{ identity: ROLES.super_admin, loading: false, login: vi.fn(), logout: vi.fn() }}>
            <AdminShell />
          </AuthContext.Provider>
        </ThemeProvider>
        </LocaleProvider>,
      );
      expect(document.querySelector('.shell-sidebar')).not.toHaveClass('shell-sidebar--collapsed');
    });

    it('honors a persisted "collapsed" choice on mount, and every nav item still carries a full "Group · Item" aria-label', () => {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true');
      render(
        <LocaleProvider>
        <ThemeProvider>
          <AuthContext.Provider value={{ identity: ROLES.super_admin, loading: false, login: vi.fn(), logout: vi.fn() }}>
            <AdminShell />
          </AuthContext.Provider>
        </ThemeProvider>
        </LocaleProvider>,
      );

      expect(document.querySelector('.shell-sidebar')).toHaveClass('shell-sidebar--collapsed');

      // Spot-check one item per group — the accessible name is what a screen
      // reader (or the CSS tooltip, keyed off the same `data-tooltip` string)
      // announces once the visible label text is hidden by collapse.
      expect(screen.getByRole('button', { name: 'Conocimiento · Mapa' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Atención · Escalaciones' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Análisis · Analítica' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Personas · Directorio' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Gobierno · Ajustes' })).toBeInTheDocument();
    });

    it('toggling the collapse button flips the modifier class and persists the choice', () => {
      render(
        <LocaleProvider>
        <ThemeProvider>
          <AuthContext.Provider value={{ identity: ROLES.super_admin, loading: false, login: vi.fn(), logout: vi.fn() }}>
            <AdminShell />
          </AuthContext.Provider>
        </ThemeProvider>
        </LocaleProvider>,
      );

      const toggle = screen.getByRole('button', { name: 'Colapsar menú' });
      fireEvent.click(toggle);

      expect(document.querySelector('.shell-sidebar')).toHaveClass('shell-sidebar--collapsed');
      expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe('true');

      fireEvent.click(screen.getByRole('button', { name: 'Expandir menú' }));

      expect(document.querySelector('.shell-sidebar')).not.toHaveClass('shell-sidebar--collapsed');
      expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe('false');
    });
  });
});
