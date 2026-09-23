// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocaleProvider, LOCALE_KEY } from './LocaleProvider';
import { useLocale } from './context';

// Sprint 11b (plan.md §C.9 "Test inventory") — jsdom is required here (same
// reason `graphColors.test.ts` needs it, unlike `layoutSeed.test.ts`):
// `LocaleProvider` reads/writes `window.localStorage`, a real DOM API.

function Probe() {
  const { locale, t, setLocale, loadingLocale } = useLocale();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="loading">{String(loadingLocale)}</span>
      <span data-testid="logout">{t.adminShell.logout}</span>
      <button onClick={() => setLocale('en')}>to-en</button>
      <button onClick={() => setLocale('es')}>to-es</button>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  // This project's vitest config doesn't set `test.globals: true`, so
  // `@testing-library/react`'s own auto-cleanup (which relies on a GLOBAL
  // `afterEach`) never registers — call it explicitly instead, same as any
  // other per-test teardown here.
  cleanup();
  window.localStorage.clear();
});

describe('LocaleProvider (plan.md §B.7 — default resolution order: localStorage → \'es\')', () => {
  it('defaults to Spanish with nothing stored', () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('es');
    expect(screen.getByTestId('logout').textContent).toBe('Log out'); // es.ts keeps this one verbatim too — see es.ts's own comment
  });

  it('honors a persisted locale on mount', () => {
    window.localStorage.setItem(LOCALE_KEY, 'en');
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('en');
  });

  it('ignores a garbage stored value and falls back to \'es\' (same try/catch posture as AdminShell.tsx:88-92)', () => {
    window.localStorage.setItem(LOCALE_KEY, 'fr');
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('es');
  });

  it('switching to English persists the choice and lazily resolves the en.ts dictionary', async () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    fireEvent.click(screen.getByText('to-en'));
    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(window.localStorage.getItem(LOCALE_KEY)).toBe('en');

    // The dictionary itself only updates once the lazy `import('./en')` chunk
    // resolves (plan.md §B.7/OQ-3) — Spanish is shown in the interim.
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('logout').textContent).toBe('Log out'); // en.ts's value, coincidentally identical to es.ts's
  });

  it('never crashes when localStorage.setItem throws (private-browsing restrictions)', () => {
    const original = window.localStorage.setItem.bind(window.localStorage);
    window.localStorage.setItem = () => {
      throw new DOMException('QuotaExceededError');
    };
    try {
      render(
        <LocaleProvider>
          <Probe />
        </LocaleProvider>,
      );
      expect(() => fireEvent.click(screen.getByText('to-en'))).not.toThrow();
      expect(screen.getByTestId('locale').textContent).toBe('en'); // in-memory state still updates even if persistence failed
    } finally {
      window.localStorage.setItem = original;
    }
  });
});
