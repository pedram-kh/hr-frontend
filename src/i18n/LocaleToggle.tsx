import { useLocale } from './context';

// Sprint 11b (plan.md §B.7) — structurally identical to `ThemeToggle`
// (`hr-frontend/src/theme/ThemeToggle.tsx`): same `btn btn-ghost` +
// `aria-label` + `data-tooltip` shape, same `className` passthrough for the
// sidebar's `.shell-nav-item` styling, same `.shell-sidebar-text` wrapper so
// the visible label hides under `.shell-sidebar--collapsed` while the
// tooltip/aria-label still carry it. Two locales, no RTL — a binary toggle
// is the correct control here, the same reasoning `ThemeToggle` already
// applies to light/dark (not a dropdown).
//
// The switch label itself is one of the few strings in this codebase that
// is deliberately NOT run through `t()`: it names the *other* locale by
// its own endonym ("Español"/"English"), which is invariant text, not
// translated chrome (an English speaker switching TO Spanish should see
// "Español", not a translated word for it).
export function LocaleToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale, loadingLocale } = useLocale();
  const next = locale === 'es' ? 'en' : 'es';
  const nextLabel = next === 'es' ? 'Español' : 'English';
  const label = `Switch to ${nextLabel}`;

  return (
    <button
      type="button"
      className={`btn btn-ghost ${className}`.trim()}
      onClick={() => setLocale(next)}
      aria-label={label}
      title={label}
      data-tooltip={label}
      disabled={loadingLocale}
    >
      <span aria-hidden="true">{locale === 'es' ? 'ES' : 'EN'}</span>
      <span className="shell-sidebar-text">{nextLabel}</span>
    </button>
  );
}
