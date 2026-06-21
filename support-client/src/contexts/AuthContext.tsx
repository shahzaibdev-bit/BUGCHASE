import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { SupportUser } from '@/types';
import { API_URL } from '@/config';

interface AuthContextType {
  user: SupportUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  googleLogin: (credential: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<SupportUser | null>;
  updateUser: (patch: Partial<SupportUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupportUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isSupportRole = (role?: string) => role === 'support' || role === 'admin';

  const fetchCurrentUser = useCallback(async (): Promise<SupportUser | null> => {
    const token = localStorage.getItem('support_token');
    const headers: HeadersInit = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/auth/me`, { headers, credentials: 'include' });
    const data = await res.json().catch(() => ({}));

    // Only support staff (and admins) may use this portal — even if a valid
    // token for another role is present.
    if (res.ok && data.user && isSupportRole(data.user.role)) {
      setUser(data.user);
      return data.user;
    }
    localStorage.removeItem('support_token');
    setUser(null);
    return null;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await fetchCurrentUser();
      } catch {
        localStorage.removeItem('support_token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [fetchCurrentUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Login failed');

      // The main backend enforces 2FA for some accounts. The support portal
      // does not implement the second step, so direct those users to the
      // primary BugChase portal.
      if (data.requiresTwoFactor) {
        throw new Error(
          'This account has two-factor authentication enabled. Please sign in through the main BugChase portal.'
        );
      }

      if (!isSupportRole(data.user?.role)) {
        throw new Error('This portal is restricted to BugChase support staff.');
      }

      if (data.token) localStorage.setItem('support_token', data.token);
      setUser(data.user);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  }, []);

  const googleLogin = useCallback(async (credential: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/support/google`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Google login failed');
      if (!isSupportRole(data.user?.role)) {
        throw new Error('This portal is restricted to BugChase support staff.');
      }
      if (data.token) localStorage.setItem('support_token', data.token);
      setUser(data.user);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Google login failed' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('support_token');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async (): Promise<SupportUser | null> => {
    try {
      return await fetchCurrentUser();
    } catch {
      return null;
    }
  }, [fetchCurrentUser]);

  const updateUser = useCallback((patch: Partial<SupportUser>) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, googleLogin, logout, refreshUser, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
