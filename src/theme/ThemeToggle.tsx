import { useTheme } from './context';

// Unobtrusive light/dark switch for the shell headers/sidebar footer.
// `className` (Sprint 11a CP-2 revision) lets a caller add layout classes
// (e.g. AdminShell's `.shell-nav-item`) without forking this component; the
// label is wrapped in `.shell-sidebar-text` so it can be hidden by CSS in a
// collapsed sidebar context — inert everywhere else, since that hiding rule
// is scoped under `.shell-sidebar--collapsed`. `data-tooltip` similarly only
// renders a visible tooltip inside that same collapsed-sidebar scope; the
// `title` attribute is kept as the unchanged native fallback everywhere else.
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'light' ? 'dark' : 'light';
  const label = `Switch to ${next} theme`;

  return (
    <button
      type="button"
      className={`btn btn-ghost ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      data-tooltip={label}
    >
      <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
      <span className="shell-sidebar-text">{theme === 'light' ? 'Dark' : 'Light'}</span>
    </button>
  );
}
