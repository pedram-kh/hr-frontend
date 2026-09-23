import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { LocaleContext, type Locale } from './context';
import { es } from './es';
import type { Dict } from './es';

// Sprint 11b (plan.md §B.7) — persistence key. Deliberately diverges from
// `ThemeProvider`'s no-persistence stance (`ThemeProvider.tsx:5-7`: "Theme is
// held in memory only… Persistence is deferred to the app's own settings
// later") — that's a documented, specific decision for THEME, not a general
// rule against persisting UI preference. `AdminShell.tsx`'s sidebar-collapse
// state already persists via `localStorage` for exactly this reason
// (`AdminShell.tsx:84-92`), so this is a second precedent, not a new one.
//
// One global key (not admin-shell-scoped like sidebar-collapse): a user's
// language choice should follow them between `/admin` and `/app`.
export const LOCALE_KEY = 'hr-locale';

// Default resolution order (plan.md §B.7): localStorage → 'es'. Wrapped in
// try/catch: private-browsing storage restrictions must never break the
// shell (same posture as `AdminShell.tsx`'s own collapse-state read).
export function initialLocale(): Locale {
  try {
    return window.localStorage.getItem(LOCALE_KEY) === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

// Sprint 11b / OQ-3 — Spanish ships in the main entry (`es.ts`, a normal
// static import, so it's always available synchronously); `en.ts` is a
// separate chunk, fetched via a plain dynamic `import()` only the first
// time a session actually switches to English, then cached in this
// module-level promise for the rest of the session. Mirrors the exact
// "dynamically imported ONLY when selected" idiom `GrafoSection.tsx:17-18`
// already uses for `GrafoView`/`Grafo2D` — this is a data module, not a
// component, so a plain `import()` is used instead of `React.lazy`, which
// is specifically for component trees.
let enPromise: Promise<{ en: Dict }> | null = null;
function loadEn(): Promise<{ en: Dict }> {
  if (!enPromise) enPromise = import('./en');
  return enPromise;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [enDict, setEnDict] = useState<Dict | null>(null);
  const [loadingLocale, setLoadingLocale] = useState(false);

  useEffect(() => {
    if (locale !== 'en' || enDict) return;
    let cancelled = false;
    setLoadingLocale(true);
    loadEn()
      .then(({ en }) => {
        if (!cancelled) setEnDict(en);
      })
      .finally(() => {
        if (!cancelled) setLoadingLocale(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale, enDict]);

  const setLocale = (next: Locale) => {
    try {
      window.localStorage.setItem(LOCALE_KEY, next);
    } catch {
      // best-effort only — a failed write never blocks switching the locale itself.
    }
    setLocaleState(next);
  };

  // While English is selected but its chunk hasn't resolved yet (first
  // switch of the session only — cached after), render falls back to the
  // Spanish dictionary rather than blocking on a Suspense boundary: every
  // key in `t` is always a real string either way, never an empty
  // placeholder mid-fetch.
  const t = locale === 'en' && enDict ? enDict : es;

  const value = useMemo(() => ({ locale, t, setLocale, loadingLocale }), [locale, t, loadingLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
