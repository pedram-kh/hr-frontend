import { useTheme } from './context';

// Unobtrusive light/dark switch for the shell headers.
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'light' ? 'dark' : 'light';

  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
      {theme === 'light' ? 'Dark' : 'Light'}
    </button>
  );
}
