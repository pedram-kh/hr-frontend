// @vitest-environment jsdom
//
// Sprint 11c (plan.md §D.1, §E.2) — the section toggle that puts Grafo behind
// the leading `.seg` of the Map's toolbar, and its deep link
// (`#view=map&tab=grafo`, wired one level up by `AdminShell` into
// `initialTab`). `Hierarchy` and `GrafoSection` are mocked to a one-line
// marker each — this test is about which one is mounted, not what either
// renders internally (that's `Hierarchy`'s and `GrafoSection`'s own concern).
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../../auth/context';
import type { Identity } from '../../../lib/api';

vi.mock('../Hierarchy', () => ({
  Hierarchy: () => <div data-testid="hierarchy-marker" />,
}));
vi.mock('../grafo/GrafoSection', () => ({
  GrafoSection: () => <div data-testid="grafo-marker" />,
}));
vi.mock('../../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/api')>('../../../lib/api');
  return { ...actual, getCoverageGaps: vi.fn(() => Promise.resolve(null)) };
});

import { KnowledgeMapPage } from '../KnowledgeMapPage';

const identity: Identity = {
  account_type: 'admin',
  uuid: 'test-uuid',
  email: 'test@hr-staging.internal',
  full_name: 'Test Admin',
  status: 'active',
  abilities: {},
};

function renderPage(initialTab: string | null) {
  render(
    <AuthContext.Provider value={{ identity, loading: false, login: vi.fn(), logout: vi.fn() }}>
      <KnowledgeMapPage initialTab={initialTab} />
    </AuthContext.Provider>,
  );
}

describe('KnowledgeMapPage — Jerarquía|Grafo section toggle (plan.md §D.1)', () => {
  afterEach(() => cleanup());

  it('with no tab, defaults to Jerarquía (every existing link keeps landing where it does today)', () => {
    renderPage(null);
    expect(screen.getByTestId('hierarchy-marker')).toBeInTheDocument();
    expect(screen.queryByTestId('grafo-marker')).not.toBeInTheDocument();
  });

  it('an unrelated tab value (e.g. from a different view) still defaults to Jerarquía', () => {
    renderPage('groups');
    expect(screen.getByTestId('hierarchy-marker')).toBeInTheDocument();
    expect(screen.queryByTestId('grafo-marker')).not.toBeInTheDocument();
  });

  it('#view=map&tab=grafo (initialTab="grafo") lands on Grafo', () => {
    renderPage('grafo');
    expect(screen.getByTestId('grafo-marker')).toBeInTheDocument();
    expect(screen.queryByTestId('hierarchy-marker')).not.toBeInTheDocument();
  });

  it('clicking the Grafo tab switches sections; clicking Jerarquía switches back', () => {
    renderPage(null);
    fireEvent.click(screen.getByRole('tab', { name: 'Grafo' }));
    expect(screen.getByTestId('grafo-marker')).toBeInTheDocument();
    expect(screen.queryByTestId('hierarchy-marker')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Jerarquía' }));
    expect(screen.getByTestId('hierarchy-marker')).toBeInTheDocument();
    expect(screen.queryByTestId('grafo-marker')).not.toBeInTheDocument();
  });

  it('the lens/form segmented controls only show in the Jerarquía section', () => {
    renderPage('grafo');
    expect(screen.queryByRole('tab', { name: 'Territory' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Jerarquía' }));
    expect(screen.getByRole('tab', { name: 'Territory' })).toBeInTheDocument();
  });
});
