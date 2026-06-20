import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { clearToken, getMe, getToken, setToken, type Identity } from '../lib/api';
import { AuthContext } from './context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  // Only "loading" if there is a token to resolve via /me on boot.
  const [loading, setLoading] = useState<boolean>(() => getToken() !== null);

  useEffect(() => {
    if (getToken() === null) return;

    let active = true;
    getMe()
      .then((res) => {
        if (active) setIdentity(res.identity);
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = (token: string, newIdentity: Identity) => {
    setToken(token);
    setIdentity(newIdentity);
  };

  const logout = () => {
    clearToken();
    setIdentity(null);
  };

  return (
    <AuthContext.Provider value={{ identity, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
