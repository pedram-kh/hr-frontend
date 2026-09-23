import { describe, expect, it } from 'vitest';
import { formatDate, formatPercent } from './format';
import { plural } from './context';

// Sprint 11b (plan.md §C.9 "Test inventory" — "one Intl.DateTimeFormat/
// Intl.PluralRules call per locale, asserting the exact expected string for
// a fixed date/count fixture in both es/en"). Fixed fixtures, not
// snapshots: a wrong `Intl` option (e.g. `dateStyle` choice) should read as
// an obviously-wrong literal string in a diff, not an opaque snapshot hash.

describe('formatDate (plan.md §B.8)', () => {
  // Date-ONLY string, no time component — deliberately NOT a datetime, so
  // this exercises `formatDate`'s UTC-anchoring fix (see format.ts's own
  // comment): without it, this fixture would render as March 4th in any
  // timezone behind UTC, making the test (and the real render site) flip
  // depending on which machine/timezone runs it.
  const FIXED_ISO = '2026-03-05';

  it('formats a fixed date-only string in Spanish (es-ES dateStyle: medium)', () => {
    expect(formatDate(FIXED_ISO, 'es')).toBe('5 mar 2026');
  });

  it('formats the same fixed date-only string in English (en-US dateStyle: medium)', () => {
    expect(formatDate(FIXED_ISO, 'en')).toBe('Mar 5, 2026');
  });

  it('returns the em-dash placeholder for a null/empty/invalid input, not a formatting error', () => {
    expect(formatDate(null, 'es')).toBe('—');
    expect(formatDate(undefined, 'es')).toBe('—');
    expect(formatDate('', 'es')).toBe('—');
    expect(formatDate('not-a-date', 'es')).toBe('—');
  });

  it('never rolls a date-only fixture back a calendar day regardless of the runner\'s own timezone', () => {
    // Every one of these must show day 5, whatever `Intl`'s locale default
    // timezone the test runner happens to use — this is the exact bug the
    // `timeZone: 'UTC'` fix in format.ts guards against.
    expect(formatDate(FIXED_ISO, 'en', { day: 'numeric' })).toBe('5');
  });

  it('supports a dateStyle+timeStyle combination for the audit-history site (DirectoryPage.tsx) — a real timestamp, so local time is correct here', () => {
    const withTime = formatDate('2026-03-05T14:30:00Z', 'en', { dateStyle: 'medium', timeStyle: 'short' });
    expect(withTime).toContain('2026');
    expect(withTime).toMatch(/\d{1,2}:\d{2}/); // a real clock time is present, exact hour is UTC-offset-dependent by design
  });
});

describe('formatPercent (plan.md §B.8)', () => {
  it('formats a fixed integer percentage per each locale\'s own spacing convention (es-ES puts a NON-BREAKING space before %, en-US does not)', () => {
    expect(formatPercent(42, 'es')).toBe('42\u00a0%');
    expect(formatPercent(42, 'en')).toBe('42%');
  });

  it('rounds to the nearest whole percent (matching the 7 Math.round(x*100) sites it replaces)', () => {
    expect(formatPercent(33.6, 'es')).toBe('34\u00a0%');
  });
});

describe('plural (plan.md §B.4.3 — the two real naive-plural R2 cases)', () => {
  it('selects the Spanish one/other category for a count of 1 vs. many (año(s) case, HistoryPage.tsx:267)', () => {
    expect(plural('es', 1, { one: 'año', other: 'años' })).toBe('año');
    expect(plural('es', 2, { one: 'año', other: 'años' })).toBe('años');
    expect(plural('es', 0, { one: 'año', other: 'años' })).toBe('años');
  });

  it('selects the English one/other category for a count of 1 vs. many (file(s) case, DocumentsPage.tsx:111)', () => {
    expect(plural('en', 1, { one: 'file', other: 'files' })).toBe('file');
    expect(plural('en', 2, { one: 'file', other: 'files' })).toBe('files');
    expect(plural('en', 0, { one: 'file', other: 'files' })).toBe('files');
  });
});
