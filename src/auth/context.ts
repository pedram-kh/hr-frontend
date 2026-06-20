import { createContext, useContext } from 'react';
import type { Identity } from '../lib/api';

export interface AuthState {
  identity: Identity | null;
  loading: boolean;
  login: (token: string, identity: Identity) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
