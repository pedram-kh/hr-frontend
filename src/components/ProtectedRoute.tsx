import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/context';

// Guards a route tree. Optionally restricts to one account type so the
// employee and admin shells stay separate (per AGENTS.md).
export function ProtectedRoute({
  children,
  accountType,
}: {
  children: ReactNode;
  accountType?: 'employee' | 'admin';
}) {
  const { identity, loading } = useAuth();

  if (loading) return <div className="centered">Loading…</div>;
  if (!identity) return <Navigate to="/login" replace />;

  if (accountType && identity.account_type !== accountType) {
    // Logged in but wrong shell — send to the correct one.
    return <Navigate to={identity.account_type === 'admin' ? '/admin' : '/app'} replace />;
  }

  return <>{children}</>;
}
