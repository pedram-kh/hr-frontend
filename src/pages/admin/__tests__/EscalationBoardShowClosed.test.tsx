// @vitest-environment jsdom
//
// Sprint 12b item 2b — the Cerrada column is hidden by default behind a
// "Mostrar cerradas (N)" toggle. Presentation only: same API call, same data.
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../../auth/context';
import { LocaleProvider } from '../../../i18n/LocaleProvider';
import type { EscalationCardSummary, EscalationList, Identity } from '../../../lib/api';
import { EscalationBoardPage } from '../EscalationBoardPage';

const KEY = 'hr-admin-board-show-closed';

const identity: Identity = {
  account_type: 'admin',
  uuid: 'a1',
  email: 'test@hr-staging.internal',
  full_name: 'Test Admin',
  status: 'active',
  abilities: { 'escalation.work': true },
  id: 1,
} as Identity;

const card = (uuid: string, status: EscalationCardSummary['status'], question: string): EscalationCardSummary => ({
  uuid,
  status,
  reason: 'low_confidence',
  reason_label: 'Confianza baja',
  question,
  reviewed_message: null,
  employee: { uuid: 'e1', full_name: 'Test Employee', convenio: null },
  assigned_to: null,
  topic: null,
  created_at: null,
  resolved_at: null,
  explanation_facts: null,
  explanation_text: null,
  fix_action: null,
  fix_surface: null,
  fix_link: null,
});

const list: EscalationList = {
  cards: [card('c1', 'new', 'OPEN-QUESTION'), card('c2', 'closed', 'CLOSED-QUESTION')],
  counts: { new: 1, assigned: 0, in_progress: 0, resolved: 0, closed: 3 },
  statuses: ['new', 'assigned', 'in_progress', 'resolved', 'closed'],
};

function mount() {
  return render(
    <LocaleProvider>
      <AuthContext.Provider value={{ identity, loading: false, login: vi.fn(), logout: vi.fn() }}>
        <EscalationBoardPage />
      </AuthContext.Provider>
    </LocaleProvider>,
  );
}

const columnTitles = () => Array.from(document.querySelectorAll('.board-col-title')).map((e) => e.textContent);

describe('EscalationBoardPage — Mostrar cerradas (Sprint 12b item 2b)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    window.localStorage.removeItem(KEY);
    fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(list) } as unknown as Response));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    cleanup();
    window.localStorage.removeItem(KEY);
    vi.unstubAllGlobals();
  });

  it('hides the Cerrada column by default and writes nothing', async () => {
    mount();
    expect(await screen.findByText('OPEN-QUESTION')).toBeInTheDocument();
    expect(columnTitles()).toEqual(['Nuevas', 'Asignadas', 'En curso', 'Resueltas']);
    expect(screen.queryByText('CLOSED-QUESTION')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('the toggle shows the closed count from the payload', async () => {
    mount();
    expect(await screen.findByLabelText('Mostrar cerradas (3)')).not.toBeChecked();
  });

  it('turning it on renders the Cerrada column with its cards, and remembers the choice', async () => {
    mount();
    fireEvent.click(await screen.findByLabelText('Mostrar cerradas (3)'));
    expect(columnTitles()).toEqual(['Nuevas', 'Asignadas', 'En curso', 'Resueltas', 'Cerradas']);
    expect(screen.getByText('CLOSED-QUESTION')).toBeInTheDocument();
    expect(window.localStorage.getItem(KEY)).toBe('true');
  });

  it('turning it off again hides the column and removes the key', async () => {
    mount();
    fireEvent.click(await screen.findByLabelText('Mostrar cerradas (3)'));
    fireEvent.click(screen.getByLabelText('Mostrar cerradas (3)'));
    expect(columnTitles()).not.toContain('Cerradas');
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('a saved "true" shows the column on mount', async () => {
    window.localStorage.setItem(KEY, 'true');
    mount();
    expect(await screen.findByText('CLOSED-QUESTION')).toBeInTheDocument();
    expect(await screen.findByLabelText('Mostrar cerradas (3)')).toBeChecked();
  });

  it('is a view preference, not a filter: no badge count, no Limpiar filtros, and the API call is unchanged', async () => {
    mount();
    fireEvent.click(await screen.findByLabelText('Mostrar cerradas (3)'));
    expect(document.querySelector('.filter-toolbar-badge')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument();
    // Same single list request, no `status` param (the column is hidden client-side).
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) expect(u).not.toContain('status=');
  });
});
