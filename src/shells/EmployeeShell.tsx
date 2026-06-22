import { useAuth } from '../auth/context';
import { ThemeToggle } from '../theme/ThemeToggle';
import { ChatScreen } from '../pages/chat/ChatScreen';

// Employee chat shell (Sprint 2b-1): the chat surface, built on the design system.
export function EmployeeShell() {
  const { identity, logout } = useAuth();

  return (
    <div className="shell shell--chat">
      <header className="shell-header">
        <strong>HR Platform — Chat</strong>
        <span className="muted">{identity?.email}</span>
        <ThemeToggle />
        <button className="btn btn-ghost" onClick={logout}>
          Log out
        </button>
      </header>
      <main className="shell-body shell-body--chat">
        <ChatScreen />
      </main>
    </div>
  );
}
