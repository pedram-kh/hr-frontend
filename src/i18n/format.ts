import type { Locale } from './context';

// Sprint 11b (plan.md §B.8) — one small module so every raw-date/number
// render site becomes a one-line swap with no per-site locale plumbing.
// Wired at DirectoryPage + the §B.8 remainder (AnalyticsPage, HistoryPage,
// GuardrailsPage, DocumentDetailPanel, ReviewQueuePage `%` sites).

const localeTag: Record<Locale, string> = { es: 'es-ES', en: 'en-US' };

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `iso` is the server's raw ISO date/datetime string (e.g.
 * `profile_last_reviewed_at`, already sliced to `YYYY-MM-DD` by callers
 * today — see plan.md §B.8). Returns `'—'` for a null/empty input so call
 * sites don't need their own guard.
 *
 * A date-ONLY string (`YYYY-MM-DD`, no time component) is formatted in UTC
 * regardless of the viewer's own timezone — `new Date('2026-03-05')` parses
 * as UTC midnight, and formatting that in any timezone behind UTC (most of
 * the Americas) in the viewer's LOCAL time would silently roll it back to
 * March 4th. The field is a calendar date with no time-of-day meaning
 * (`profile_last_reviewed_at`'s original raw `.slice(0, 10)` never had this
 * bug precisely because it never went through `Date` at all); a real
 * timestamp like `changed_at` (has a time component) is intentionally
 * formatted in the viewer's local time instead, matching
 * `GuardrailsPage.tsx:380`'s existing `toLocaleString()` precedent.
 */
export function formatDate(iso: string | null | undefined, locale: Locale, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const finalOpts = DATE_ONLY_RE.test(iso) ? { ...opts, timeZone: 'UTC' } : opts;
  return new Intl.DateTimeFormat(localeTag[locale], finalOpts).format(d);
}

export function formatPercent(n: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag[locale], { style: 'percent', maximumFractionDigits: 0 }).format(n / 100);
}
