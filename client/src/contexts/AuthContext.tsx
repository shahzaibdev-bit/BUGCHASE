import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { User, UserRole } from '@/types';
import { API_URL } from '@/config';
import { toast } from 'sonner';

export type LoginOutcome =
  | { success: true; user: User }
  | { success: false; error: string }
  | { success: false; requiresTwoFactor: true; twoFactorToken: string };

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, totp?: string) => Promise<LoginOutcome>;
  completeTwoFactorLogin: (twoFactorToken: string, totp: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  signup: (email: string, password: string, name: string, role: 'researcher' | 'company') => Promise<{ success: boolean; error?: string }>;
  verifyEmail: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<User | null>;
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let inflightMeRequest: Promise<User | null> | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const fetchCurrentUser = useCallback(async (): Promise<User | null> => {
    if (inflightMeRequest) return inflightMeRequest;

    inflightMeRequest = (async () => {
    const storedToken = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (storedToken && storedToken !== 'null' && storedToken !== 'undefined') {
      headers.Authorization = `Bearer ${storedToken}`;
    }

    const applyUser = (nextUser: User, nextToken?: string) => {
      setUser(nextUser);
      userRef.current = nextUser;
      lastRefreshAtRef.current = Date.now();
      if (nextToken) localStorage.setItem('token', nextToken);
      return nextUser;
    };

    const requestMe = async (authHeaders: HeadersInit = {}) => {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: authHeaders,
        credentials: 'include',
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      return { res, data };
    };

    try {
      let { res, data } = await requestMe(headers);

      if (res.status === 429) {
        for (const delayMs of [800, 1600]) {
          await sleep(delayMs);
          ({ res, data } = await requestMe(headers));
          if (res.status !== 429) break;
        }
      }

      if ((res.status === 401 || res.status === 403) && headers.Authorization) {
        const retry = await requestMe({});
        res = retry.res;
        data = retry.data;
        if (res.status === 429) {
          await sleep(1000);
          ({ res, data } = await requestMe({}));
        }
      }

      if (res.ok && data.user) {
        return applyUser(data.user, data.token);
      }

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        setUser(null);
        userRef.current = null;
        return null;
      }

      return userRef.current;
    } catch {
      return userRef.current;
    }
    })();

    try {
      return await inflightMeRequest;
    } finally {
      inflightMeRequest = null;
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await fetchCurrentUser();
      } catch {
        // Network error on boot — session may still be valid via cookie.
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [fetchCurrentUser]);

  const login = useCallback(async (email: string, password: string, totp?: string): Promise<LoginOutcome> => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(totp ? { totp } : {}) }),
      });
      let data: any;
      try {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          console.error('Failed to parse login response:', text);
          throw new Error('Server returned invalid response');
        }
      } catch (err: any) {
        throw new Error(err.message || 'Login failed');
      }

      if (!res.ok) throw new Error(data.message || 'Login failed');

      if (data.requiresTwoFactor && data.twoFactorToken) {
        return { success: false, requiresTwoFactor: true, twoFactorToken: data.twoFactorToken };
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  }, []);

  const completeTwoFactorLogin = useCallback(
    async (twoFactorToken: string, totp: string): Promise<{ success: boolean; error?: string; user?: User }> => {
      try {
        const res = await fetch(`${API_URL}/auth/login-2fa`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ twoFactorToken, totp }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Two-factor verification failed');
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        setUser(data.user);
        return { success: true, user: data.user };
      } catch (error: any) {
        return { success: false, error: error.message || 'Two-factor verification failed' };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      // await fetch(`${API_URL}/auth/logout`); // Optional: Call server logout if needed
      localStorage.removeItem('token');
      setUser(null);
    } catch (error) {
      console.error('Logout failed', error);
      setUser(null); // Clear state anyway
    }
  }, []);

  const signup = useCallback(async (
    email: string, 
    password: string, 
    name: string, 
    role: 'researcher' | 'company'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Signup failed');

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, []);

  const verifyEmail = useCallback(async (email: string, otp: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Verification failed');

      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      setUser(data.user);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      return await fetchCurrentUser();
    } catch (error) {
      console.error('Failed to refresh user', error);
      return userRef.current;
    }
  }, [fetchCurrentUser]);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  useEffect(() => {
    const refreshIfStale = () => {
      if (!userRef.current) return;
      if (Date.now() - lastRefreshAtRef.current < 60_000) return;
      void refreshUser();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshIfStale();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('bugchase:user-updated', refreshIfStale);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('bugchase:user-updated', refreshIfStale);
    };
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        completeTwoFactorLogin,
        logout,
        signup,
        verifyEmail,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
