import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../auth/context';
import { ThemeToggle } from '../theme/ThemeToggle';
import { ChatScreen } from '../pages/chat/ChatScreen';
import { BRAND } from '../theme/brand';

// Employee chat shell (Sprint 2b-1): the chat surface, built on the design system.
// Sprint 11c (§E.1 scope addition): the header now shows the same brand
// wordmark as the admin sidebar (see AdminShell.tsx's `.shell-sidebar-logo`
// comment — `logo.svg` already reads the product name visually, so
// `BRAND.productName` is its `alt`, not a second on-screen label) instead of
// a plain "{BRAND.productName} — Chat" string. At narrow widths the header
// collapses to logo + hamburger; `.shell-header-actions` (email, theme
// toggle, logout) becomes a dropdown under the header instead of disappearing.
export function EmployeeShell() {
  const { identity, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="shell shell--chat">
      <header className="shell-header shell-header--chat">
        <img src={BRAND.logo} alt={BRAND.productName} className="shell-header-logo" />
        <div className={`shell-header-actions ${menuOpen ? 'is-open' : ''}`}>
          <span className="muted">{identity?.email}</span>
          <ThemeToggle />
          <button className="btn btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
        <button
          type="button"
          className="btn btn-ghost shell-header-menu-btn"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </header>
      <main className="shell-body shell-body--chat">
        <ChatScreen />
      </main>
    </div>
  );
}
