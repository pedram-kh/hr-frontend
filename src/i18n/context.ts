import { createContext, useContext } from 'react';
import { es, type Dict } from './es';

// Sprint 11b (plan.md §B.4.5) — hand-rolled typed `t()`, not `react-i18next`
// (measured bundle delta: +0.2 KB vs +16.4 KB gzip for this codebase's
// actual corpus, plan.md §B.4.1). "t" is not a function here — it's the
// resolved dictionary object itself, so a typo'd path is a `tsc -b` error
// at the call site with zero setup (plain TypeScript property access), a
// stronger guarantee than `react-i18next`'s `t('typo')` (silently compiles,
// falls back to the raw key at runtime unless a second, hand-maintained
// `CustomTypeOptions` augmentation is added — §B.4.2).
export type Locale = 'es' | 'en';

export interface LocaleState {
  locale: Locale;
  /** The resolved dictionary for the active locale. Call sites read `t.area.key`. */
  t: Dict;
  setLocale: (locale: Locale) => void;
  /** True only while `en.ts`'s lazy chunk is being fetched after a switch to 'en'. */
  loadingLocale: boolean;
}

export const LocaleContext = createContext<LocaleState | undefined>(undefined);

export function useLocale(): LocaleState {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}

/** Convenience hook for call sites that only need the dictionary, not the locale/setter. */
export function useT(): Dict {
  return useLocale().t;
}

// One `Intl.PluralRules` instance per locale (a browser built-in, zero bytes
// shipped) — the R2 "naive plural" cases found in plan.md §A.1
// (`file(s)`, `año(s)`) get the *same* one/other category split
// `i18next`'s CLDR engine would give them for these two languages, at no
// library cost (§B.4.3). Spanish and English share the simplest CLDR plural
// shape (one/other), so this two-category `forms` object is exhaustive for
// every real case in this corpus — it is not a general Arabic/Polish-style
// pluralizer, and doesn't need to be (spec: exactly 2 locales, no RTL).
const pluralRules: Record<Locale, Intl.PluralRules> = {
  es: new Intl.PluralRules('es'),
  en: new Intl.PluralRules('en'),
};

export function plural(locale: Locale, n: number, forms: { one: string; other: string }): string {
  return pluralRules[locale].select(n) === 'one' ? forms.one : forms.other;
}

/** The default/Spanish dictionary, for call sites that run outside a `LocaleProvider` (none expected in practice, but keeps `es` importable standalone). */
export const defaultDict: Dict = es;
