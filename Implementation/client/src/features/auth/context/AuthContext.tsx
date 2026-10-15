import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as authApi from '../api/auth.api';
import type { MeProfile } from '../api/auth.api';

// ── Context shape ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: MeProfile | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (body: { enrollmentNo: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  /** Try to rehydrate session from the existing httpOnly cookie. */
  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  // On mount — check if there is already a valid session cookie
  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    async (body: { enrollmentNo: string; password: string }) => {
      const { user: me } = await authApi.login(body);
      // Merge with full profile (login returns partial)
      const fullProfile = await authApi.getMe();
      setUser(fullProfile ?? (me as unknown as MeProfile));
    },
    [],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    queryClient.clear(); // clear all cached queries on logout
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isLoggedIn: !!user, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
