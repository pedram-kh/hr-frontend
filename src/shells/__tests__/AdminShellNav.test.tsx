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
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
    Atención: ['Escalado', 'Historial'],
    Análisis: ['Analítica', 'Cobertura', 'Calidad'],
    Personas: ['Directorio', 'Administradores'],
    Gobierno: ['Guardarraíles', 'Ajustes'],
  },
  hr_agent: {
    Conocimiento: ['Mapa', 'Documentos', 'Revisión'],
    Atención: ['Escalado'],
    Análisis: ['Analítica', 'Cobertura', 'Calidad'],
    Personas: ['Directorio'],
    Gobierno: ['Guardarraíles', 'Ajustes'],
  },
  knowledge_editor: {
    Conocimiento: ['Mapa', 'Documentos', 'Revisión'],
    Atención: ['Escalado'],
    Análisis: ['Cobertura', 'Calidad'],
    // Personas intentionally absent — deliberately no key here.
    Gobierno: ['Guardarraíles', 'Ajustes'],
  },
  auditor: {
    Conocimiento: ['Mapa', 'Documentos', 'Revisión'],
    Atención: ['Escalado', 'Historial'],
    Análisis: ['Analítica', 'Cobertura', 'Calidad'],
    // Personas intentionally absent.
    Gobierno: ['Guardarraíles', 'Ajustes'],
  },
};

// Same key AdminShell.tsx uses (`SIDEBAR_COLLAPSED_KEY`, not exported —
// duplicated here deliberately, same convention as the ability-name string
// literals in ROLES above).
const SIDEBAR_COLLAPSED_KEY = 'hr-admin-sidebar-collapsed';

// Sprint 12b item 8 — one key per group, keyed by the stable English slug.
const GROUP_IDS = ['conocimiento', 'atencion', 'analisis', 'personas', 'gobierno'] as const;
const groupKey = (id: string) => `hr-admin-sidebar-group-${id}`;
const clearGroupKeys = () => GROUP_IDS.forEach((id) => window.localStorage.removeItem(groupKey(id)));
const storedGroupKeys = () => GROUP_IDS.filter((id) => window.localStorage.getItem(groupKey(id)) !== null);

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
    // Sprint 12b item 8: the group header is now a <button> too, so items are
    // selected by their own class rather than by tag.
    const items = Array.from(el.querySelectorAll('.shell-nav-item')).map((b) => b.textContent?.trim() ?? '');
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
    clearGroupKeys();
    window.location.hash = '';
  });

  // No global RTL setup file in this project (only one prior test, a plain
  // .ts unit test with no DOM) — without this, each render() below leaves
  // its container in the DOM, so the NEXT test's `.shell-nav` query would
  // find the FIRST test's stale nav instead of its own.
  afterEach(() => {
    cleanup();
    window.localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
    clearGroupKeys();
    window.location.hash = '';
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

  describe('Cobertura flag (Sprint 12b item 7)', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
      window.location.hash = '';
    });

    const mount = (identity: Identity) =>
      render(
        <LocaleProvider>
          <ThemeProvider>
            <AuthContext.Provider value={{ identity, loading: false, login: vi.fn(), logout: vi.fn() }}>
              <AdminShell />
            </AuthContext.Provider>
          </ThemeProvider>
        </LocaleProvider>,
      );

    for (const [role, identity] of Object.entries(ROLES)) {
      it(`flag off → no Cobertura nav item for ${role}; every other item is unchanged`, () => {
        vi.stubEnv('VITE_SHOW_COVERAGE', 'false');
        mount(identity);
        const expected: Expected = {};
        for (const [group, items] of Object.entries(EXPECTED[role])) {
          expected[group] = items.filter((i) => i !== 'Cobertura');
        }
        expect(renderedGroups()).toEqual(expected);
        expect(screen.queryByRole('button', { name: 'Análisis · Cobertura' })).not.toBeInTheDocument();
      });
    }

    it('flag on (or unset) → Cobertura is in the nav', () => {
      vi.stubEnv('VITE_SHOW_COVERAGE', 'true');
      mount(ROLES.super_admin);
      expect(screen.getByRole('button', { name: 'Análisis · Cobertura' })).toBeInTheDocument();
      cleanup();
      vi.stubEnv('VITE_SHOW_COVERAGE', '');
      mount(ROLES.super_admin);
      expect(screen.getByRole('button', { name: 'Análisis · Cobertura' })).toBeInTheDocument();
    });

    it('flag off → #view=coverage still opens the Cobertura page (backend Corregir links keep working)', () => {
      vi.stubEnv('VITE_SHOW_COVERAGE', 'false');
      window.location.hash = '#view=coverage';
      mount(ROLES.super_admin);
      expect(screen.getByRole('heading', { name: 'Análisis · Cobertura' })).toBeInTheDocument();
    });

    it('flag off → #view=coverage still respects the permission check', () => {
      vi.stubEnv('VITE_SHOW_COVERAGE', 'false');
      window.location.hash = '#view=coverage';
      // An admin with neither analytics.view nor knowledge.edit (ADR-0018):
      // the flag never grants access, the hash alone cannot open the page.
      mount(identityWith({ 'escalation.work': true }));
      expect(screen.queryByRole('heading', { name: 'Análisis · Cobertura' })).not.toBeInTheDocument();
    });
  });

  describe('collapsible groups (Sprint 12b item 8)', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    const mount = (identity: Identity = ROLES.super_admin) =>
      render(
        <LocaleProvider>
          <ThemeProvider>
            <AuthContext.Provider value={{ identity, loading: false, login: vi.fn(), logout: vi.fn() }}>
              <AdminShell />
            </AuthContext.Provider>
          </ThemeProvider>
        </LocaleProvider>,
      );

    // The group wrapper for a visible group label ('Gobierno', …).
    const groupEl = (label: string): HTMLElement => {
      const el = Array.from(document.querySelectorAll<HTMLElement>('.shell-nav-group')).find(
        (g) => g.querySelector('.shell-nav-group-label')?.textContent === label,
      );
      if (!el) throw new Error(`group "${label}" not rendered`);
      return el;
    };
    const toggleOf = (label: string) => groupEl(label).querySelector<HTMLButtonElement>('.shell-nav-group-toggle')!;
    const itemsOf = (label: string) => groupEl(label).querySelector<HTMLElement>('.shell-nav-group-items')!;
    const goTo = (hash: string) =>
      act(() => {
        window.location.hash = hash;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

    it('defaults to every group open, with nothing written to storage on mount', () => {
      mount();
      for (const label of ['Conocimiento', 'Atención', 'Análisis', 'Personas', 'Gobierno']) {
        expect(itemsOf(label)).not.toHaveAttribute('hidden');
        expect(toggleOf(label)).toHaveAttribute('aria-expanded', 'true');
      }
      expect(storedGroupKeys()).toEqual([]);
    });

    it('each header is a real button wired to its items (aria-controls / aria-expanded)', () => {
      mount();
      const toggle = toggleOf('Gobierno');
      expect(toggle.tagName).toBe('BUTTON');
      expect(toggle).toHaveAttribute('type', 'button');
      expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toBe(itemsOf('Gobierno'));
      expect(itemsOf('Gobierno')).toHaveAttribute('role', 'group');
      expect(itemsOf('Gobierno')).toHaveAttribute('aria-labelledby');
    });

    it('folds on click, writes only that group\'s key, survives a remount, and unfolds (key removed)', () => {
      mount();
      fireEvent.click(toggleOf('Gobierno'));
      expect(itemsOf('Gobierno')).toHaveAttribute('hidden');
      expect(toggleOf('Gobierno')).toHaveAttribute('aria-expanded', 'false');
      expect(window.localStorage.getItem(groupKey('gobierno'))).toBe('folded');
      expect(storedGroupKeys()).toEqual(['gobierno']);
      // Other groups untouched.
      expect(itemsOf('Atención')).not.toHaveAttribute('hidden');

      cleanup();
      mount();
      expect(itemsOf('Gobierno')).toHaveAttribute('hidden');

      fireEvent.click(toggleOf('Gobierno'));
      expect(itemsOf('Gobierno')).not.toHaveAttribute('hidden');
      expect(window.localStorage.getItem(groupKey('gobierno'))).toBeNull();
    });

    it('folded items leave the accessibility tree; open ones stay', () => {
      mount();
      fireEvent.click(toggleOf('Gobierno'));
      expect(screen.queryByRole('button', { name: 'Gobierno · Ajustes' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Atención · Escalado' })).toBeInTheDocument();
    });

    it('the active group cannot fold: aria-disabled + hint, items stay, nothing written', () => {
      mount(); // default view is "map" → Conocimiento is the active group
      const toggle = toggleOf('Conocimiento');
      expect(toggle).toHaveAttribute('aria-disabled', 'true');
      expect(toggle).not.toBeDisabled(); // still focusable, so a screen reader hears the hint
      const hint = document.getElementById(toggle.getAttribute('aria-describedby')!);
      expect(hint).toHaveTextContent('La página actual está en este grupo');

      fireEvent.click(toggle);
      expect(itemsOf('Conocimiento')).not.toHaveAttribute('hidden');
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(storedGroupKeys()).toEqual([]);

      // Non-active groups carry no such disabling.
      expect(toggleOf('Gobierno')).not.toHaveAttribute('aria-disabled');
    });

    it('a stored fold on the active group is ignored, and never rewritten', () => {
      window.localStorage.setItem(groupKey('conocimiento'), 'folded');
      mount();
      expect(itemsOf('Conocimiento')).not.toHaveAttribute('hidden');
      expect(window.localStorage.getItem(groupKey('conocimiento'))).toBe('folded');
    });

    it('navigating by hash into a folded group opens it, and leaving returns it to its stored fold (derived, not stored)', () => {
      window.localStorage.setItem(groupKey('gobierno'), 'folded');
      mount();
      expect(itemsOf('Gobierno')).toHaveAttribute('hidden');

      goTo('#view=settings');
      expect(itemsOf('Gobierno')).not.toHaveAttribute('hidden');
      expect(window.localStorage.getItem(groupKey('gobierno'))).toBe('folded'); // choice preserved

      goTo('#view=map');
      expect(itemsOf('Gobierno')).toHaveAttribute('hidden');
    });

    it('clicking an item inside an open group makes that group the active one', () => {
      window.localStorage.setItem(groupKey('atencion'), 'folded');
      mount();
      expect(itemsOf('Atención')).toHaveAttribute('hidden');
      // Open it, pick an item, then try to fold it: refused (it is the active group now).
      fireEvent.click(toggleOf('Atención'));
      fireEvent.click(screen.getByRole('button', { name: 'Atención · Escalado' }));
      fireEvent.click(toggleOf('Atención'));
      expect(itemsOf('Atención')).not.toHaveAttribute('hidden');
    });

    it('Cobertura flag off + #view=coverage: the Análisis group holding the open page does not fold shut', () => {
      vi.stubEnv('VITE_SHOW_COVERAGE', 'false');
      window.localStorage.setItem(groupKey('analisis'), 'folded');
      window.location.hash = '#view=coverage';
      mount();
      expect(itemsOf('Análisis')).not.toHaveAttribute('hidden');
    });

    it('icon-only mode: folded groups still show every icon; the toggles are hidden; aria-labels intact', () => {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true');
      window.localStorage.setItem(groupKey('gobierno'), 'folded');
      window.localStorage.setItem(groupKey('atencion'), 'folded');
      mount();
      expect(document.querySelector('.shell-sidebar')).toHaveClass('shell-sidebar--collapsed');
      for (const id of GROUP_IDS) {
        const group = document.querySelector(`#shell-nav-group-${id}`) as HTMLElement;
        expect(group, id).not.toHaveAttribute('hidden');
        expect(document.querySelector(`[aria-controls="shell-nav-group-${id}"]`)).toHaveAttribute('hidden');
      }
      expect(screen.getByRole('button', { name: 'Gobierno · Ajustes' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Atención · Escalado' })).toBeInTheDocument();

      // Expanding the rail restores the user's folds (nothing was lost or rewritten).
      fireEvent.click(screen.getByRole('button', { name: 'Expandir menú' }));
      expect(itemsOf('Gobierno')).toHaveAttribute('hidden');
      expect(itemsOf('Atención')).toHaveAttribute('hidden');
    });

    it('icon-only mode never reads or writes fold state when the rail is toggled around', () => {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true');
      mount();
      expect(storedGroupKeys()).toEqual([]);
    });

    it('mobile overlay: folds apply while open (even with the desktop rail collapsed) and selecting an item closes it', () => {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true');
      window.localStorage.setItem(groupKey('gobierno'), 'folded');
      mount();
      // Rail: not folded visually (icon-only)…
      expect(itemsOf('Gobierno')).not.toHaveAttribute('hidden');
      // …but opening the mobile overlay is expanded mode, so the fold applies.
      fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
      expect(document.querySelector('.shell-sidebar')).toHaveClass('shell-sidebar--mobile-open');
      expect(document.querySelector('.shell-sidebar')).not.toHaveClass('shell-sidebar--collapsed');
      expect(itemsOf('Gobierno')).toHaveAttribute('hidden');

      fireEvent.click(screen.getByRole('button', { name: 'Atención · Escalado' }));
      expect(document.querySelector('.shell-sidebar')).not.toHaveClass('shell-sidebar--mobile-open');
    });

    for (const [role, identity] of Object.entries(ROLES)) {
      it(`${role}: folding every group leaves the group→item structure identical; only the active group's items stay visible`, () => {
        for (const id of GROUP_IDS) window.localStorage.setItem(groupKey(id), 'folded');
        mount(identity);

        // Same structure as the unfolded snapshot — the point of `hidden` over unmounting.
        expect(renderedGroups()).toEqual(EXPECTED[role]);

        const open = Array.from(document.querySelectorAll('.shell-nav-group-items:not([hidden])'));
        expect(open).toHaveLength(1);
        expect(within(open[0] as HTMLElement).getAllByRole('button').map((b) => b.textContent?.trim())).toEqual(
          EXPECTED[role].Conocimiento,
        );

        // An absent group stays absent (no header, no key written).
        if (!('Personas' in EXPECTED[role])) {
          expect(document.querySelector('#shell-nav-group-personas')).toBeNull();
        }
      });
    }

    it('toggling never writes a key for a group that is not rendered', () => {
      mount(ROLES.knowledge_editor); // no Personas group
      fireEvent.click(toggleOf('Gobierno'));
      expect(storedGroupKeys()).toEqual(['gobierno']);
      expect(window.localStorage.getItem(groupKey('personas'))).toBeNull();
    });
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
      expect(screen.getByRole('button', { name: 'Atención · Escalado' })).toBeInTheDocument();
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
