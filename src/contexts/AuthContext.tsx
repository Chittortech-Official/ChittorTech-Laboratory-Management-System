'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, AuthState, AccountRequestPayload } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  submitAccountRequest: (payload: AccountRequestPayload) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'chittortech_qa_lms_user';
const LOCAL_STORAGE_REQUESTS_KEY = 'chittortech_qa_account_requests';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);

    // Failsafe timeout: never keep user stuck on loading spinner for more than 1.2s
    const timer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 1200);

    if (configured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        // Fetch current active session from Supabase safely
        supabase.auth.getSession()
          .then(({ data, error }) => {
            if (!isMounted) return;
            if (error) {
              console.warn('Session check notice:', error.message);
              setUser(null);
            } else if (data?.session?.user) {
              const u = data.session.user;
              setUser({
                id: u.id,
                email: u.email || '',
                fullName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'QA Engineer',
                role: u.user_metadata?.role || 'qa_engineer',
                companyName: u.user_metadata?.company_name || 'Industrial Facility',
                plantName: u.user_metadata?.plant_name || 'Main QA Lab',
                designation: u.user_metadata?.designation || 'Quality Engineer',
                createdAt: u.created_at,
              });
            } else {
              setUser(null);
            }
          })
          .catch((err) => {
            console.warn('Session getSession catch:', err);
            if (isMounted) setUser(null);
          })
          .finally(() => {
            if (isMounted) setLoading(false);
          });

        // Listen for Supabase auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!isMounted) return;
          if (session?.user) {
            const u = session.user;
            setUser({
              id: u.id,
              email: u.email || '',
              fullName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'QA Engineer',
              role: u.user_metadata?.role || 'qa_engineer',
              companyName: u.user_metadata?.company_name || 'Industrial Facility',
              plantName: u.user_metadata?.plant_name || 'Main QA Lab',
              designation: u.user_metadata?.designation || 'Quality Engineer',
              createdAt: u.created_at,
            });
          } else {
            setUser(null);
          }
          setLoading(false);
        });

        return () => {
          isMounted = false;
          clearTimeout(timer);
          subscription.unsubscribe();
        };
      } else {
        setLoading(false);
      }
    } else {
      // Local fallback during development/testing
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        if (cached) {
          setUser(JSON.parse(cached));
        }
      } catch {}
      setLoading(false);
    }

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Database connection unavailable' };
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, error: error.message };
      }
      if (data.user) {
        const u = data.user;
        setUser({
          id: u.id,
          email: u.email || email,
          fullName: u.user_metadata?.full_name || email.split('@')[0],
          role: u.user_metadata?.role || 'qa_engineer',
          companyName: u.user_metadata?.company_name || 'Industrial Facility',
          plantName: u.user_metadata?.plant_name || 'Main QA Lab',
          designation: u.user_metadata?.designation || 'Quality Engineer',
          createdAt: u.created_at,
        });
      }
      return { success: true };
    } else {
      // Local development simulation for test credentials
      const mockUser: UserProfile = {
        id: 'usr_' + Math.random().toString(36).substring(2, 9),
        email,
        fullName: email.split('@')[0].replace('.', ' ').toUpperCase(),
        role: 'qa_engineer',
        companyName: 'ChittorTech Cement Works',
        plantName: 'Chittorgarh Unit 1',
        designation: 'Senior QA / QC Chemist',
        createdAt: new Date().toISOString(),
      };
      setUser(mockUser);
      try {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
      } catch {}
      return { success: true };
    }
  };

  const logout = async (): Promise<void> => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } else {
      try {
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      } catch {}
    }
    setUser(null);
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Database connection unavailable' };
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } else {
      return { success: true };
    }
  };

  const submitAccountRequest = async (payload: AccountRequestPayload): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Database connection is not available.' };

      const { error } = await supabase.from('account_requests').insert([
        {
          full_name: payload.fullName,
          work_email: payload.workEmail,
          company_name: payload.companyName,
          plant_name: payload.plantName,
          designation: payload.designation,
          phone: payload.phone,
          city: payload.city,
          state: payload.state,
          reason: payload.reason,
          status: 'pending',
        },
      ]);

      if (error) {
        console.error('Account request insertion error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } else {
      // Local fallback storing request in localStorage
      try {
        const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_REQUESTS_KEY) || '[]');
        existing.push({
          ...payload,
          id: 'req_' + Math.random().toString(36).substring(2, 9),
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem(LOCAL_STORAGE_REQUESTS_KEY, JSON.stringify(existing));
      } catch {}
      return { success: true };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured,
        login,
        logout,
        resetPassword,
        submitAccountRequest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
