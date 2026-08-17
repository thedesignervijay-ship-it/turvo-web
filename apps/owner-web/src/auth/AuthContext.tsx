import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase.js';
import { setApiTokenProvider, setApiUnauthorizedHandler } from '../lib/apiClient.js';
import { getMe, logout as apiLogout } from '../services/auth.service.js';
import type { MeResponse } from '../types/domain.js';
import { ROLES } from '@turvo/shared';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  me: MeResponse | null;
  /** True once the owner session has been fully resolved. */
  isOwner: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [me, setMe] = useState<MeResponse | null>(null);
  const tokenRef = useRef<string | null>(null);

  const clearSession = useCallback(async () => {
    tokenRef.current = null;
    setMe(null);
    setStatus('unauthenticated');
    await supabase.auth.signOut();
  }, []);

  const resolveMe = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;
    tokenRef.current = token;
    if (!token) {
      setStatus('unauthenticated');
      return;
    }
    const response = await getMe();
    if (response.user.role !== ROLES.OWNER) {
      await clearSession();
      throw new Error('This account is not authorized to use the owner application.');
    }
    setMe(response);
    setStatus('authenticated');
  }, [clearSession]);

  useEffect(() => {
    setApiTokenProvider(() => tokenRef.current);
    setApiUnauthorizedHandler(() => {
      void (async () => {
        await clearSession();
        window.location.assign('/login');
      })();
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      tokenRef.current = session?.access_token ?? null;
    });

    void resolveMe().catch(() => {
      void clearSession();
    });

    return () => subscription.subscription.unsubscribe();
  }, [clearSession, resolveMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw new Error(mapAuthError(error.message));
      }
      const token = data.session?.access_token ?? null;
      tokenRef.current = token;
      const response = await getMe();
      if (response.user.role !== ROLES.OWNER) {
        await clearSession();
        throw new Error('This account is not authorized to use the owner application.');
      }
      setMe(response);
      setStatus('authenticated');
    },
    [clearSession],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // The Supabase sign-out below is what actually terminates the session.
    }
    await clearSession();
  }, [clearSession]);

  const refreshMe = useCallback(async () => {
    const response = await getMe();
    if (response.user.role !== ROLES.OWNER) {
      await clearSession();
      throw new Error('This account is not authorized to use the owner application.');
    }
    setMe(response);
  }, [clearSession]);

  const hasPermission = useCallback(
    (permission: string) => me?.permissions.includes(permission) ?? false,
    [me],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      me,
      isOwner: status === 'authenticated' && me?.user.role === ROLES.OWNER,
      login,
      logout,
      hasPermission,
      refreshMe,
    }),
    [status, me, login, logout, hasPermission, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider.');
  return ctx;
}

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }
  if (lower.includes('rate limit')) {
    return 'Too many attempts. Please try again later.';
  }
  return message;
}
