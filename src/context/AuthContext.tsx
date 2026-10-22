import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseReady, getStoredSupabaseConfig } from '../services/supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  teacherName: string;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register' | 'config';
  openAuthModal: (tab?: 'login' | 'register' | 'config') => void;
  closeAuthModal: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<{ error: string | null }>;
  updateTeacherName: (newName: string) => Promise<{ error: string | null }>;
  refreshConfig: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(isSupabaseReady());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'config'>('login');

  const refreshConfig = useCallback(() => {
    const ready = isSupabaseReady();
    setIsConfigured(ready);
    const supabase = getSupabase();
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
      });
    } else {
      setSession(null);
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn('[Auth] Error getting initial session:', error.message);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    }).catch(err => {
      console.warn('[Auth] Exception getting initial session:', err);
      setIsLoading(false);
    });

    // 2. Listen to ongoing auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const openAuthModal = useCallback((tab: 'login' | 'register' | 'config' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: 'Chưa cấu hình Supabase URL và Anon Key. Vui lòng kiểm tra tab Cấu hình.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Vietnamese friendly message translation
        let msg = error.message;
        if (msg.includes('Invalid login credentials')) {
          msg = 'Email hoặc mật khẩu không chính xác. Cô vui lòng kiểm tra lại nhé!';
        } else if (msg.includes('Email not confirmed')) {
          msg = 'Tài khoản chưa được kích hoạt qua email. Cô vui lòng kiểm tra hòm thư đến nhé!';
        }
        return { error: msg };
      }

      setUser(data.user);
      setSession(data.session);
      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Có lỗi xảy ra khi kết nối đến Supabase.' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<{ error: string | null; needsEmailConfirmation?: boolean }> => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: 'Chưa cấu hình Supabase URL và Anon Key. Vui lòng kiểm tra tab Cấu hình.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim() || 'Cô Giáo',
          },
        },
      });

      if (error) {
        let msg = error.message;
        if (msg.includes('User already registered')) {
          msg = 'Email này đã được đăng ký tài khoản trước đó. Cô có thể bấm sang Đăng nhập nhé!';
        } else if (msg.includes('Password should be at least')) {
          msg = 'Mật khẩu cần tối thiểu 6 ký tự để bảo mật an toàn.';
        }
        return { error: msg };
      }

      if (data.session) {
        setUser(data.user);
        setSession(data.session);
        return { error: null, needsEmailConfirmation: false };
      }

      return { error: null, needsEmailConfirmation: true };
    } catch (err: any) {
      return { error: err?.message || 'Có lỗi xảy ra khi đăng ký tài khoản.' };
    }
  };

  const signOut = async (): Promise<{ error: string | null }> => {
    const supabase = getSupabase();
    if (!supabase) {
      setUser(null);
      setSession(null);
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } catch (err: any) {
      setUser(null);
      setSession(null);
      return { error: err?.message || 'Lỗi khi đăng xuất' };
    }
  };

  const updateTeacherName = async (newName: string): Promise<{ error: string | null }> => {
    const supabase = getSupabase();
    if (!supabase || !user) {
      return { error: 'Chưa đăng nhập' };
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: newName.trim() },
      });

      if (error) return { error: error.message };
      setUser(data.user);
      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Lỗi cập nhật thông tin' };
    }
  };

  const teacherName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Cô giáo';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isConfigured,
        teacherName,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        signIn,
        signUp,
        signOut,
        updateTeacherName,
        refreshConfig,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
