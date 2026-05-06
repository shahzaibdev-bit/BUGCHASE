import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/auth/me`, {
          headers,
          credentials: 'include',
        }); 
        const data = await res.json();
        if (res.ok && data.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (error) {
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

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

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { 
          'Authorization': `Bearer ${token}` 
        },
        credentials: 'include',
      }); 
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user', error);
    }
  }, []);

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
