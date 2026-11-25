'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, AuthState, AccountRequestPayload } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  submitAccountRequest: (payload: AccountRequestPayload) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'chittortech_qa_lms_user';
const LOCAL_STORAGE_REQUESTS_KEY = 'chittortech_qa_account_requests';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);

  // Explicit initialization flag: TRUE while checking session with Supabase
  const [loading, setLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    // Immediately restore cached user on client mount without causing SSR hydration mismatch
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (cached) {
        setUser(JSON.parse(cached));
      }
    } catch (err) {
      console.warn('Could not read cached auth session:', err);
    }
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);

    // Failsafe timeout: never leave user hanging on loader indefinitely
    const timer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 2000);

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
              try { localStorage.removeItem(LOCAL_STORAGE_USER_KEY); } catch {}
            } else if (data?.session?.user) {
              const u = data.session.user;
              const profile: UserProfile = {
                id: u.id,
                email: u.email || '',
                fullName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'QA Engineer',
                role: u.user_metadata?.role || 'qa_engineer',
                companyName: u.user_metadata?.company_name || 'Industrial Facility',
                plantName: u.user_metadata?.plant_name || 'Main QA Lab',
                designation: u.user_metadata?.designation || 'Quality Engineer',
                createdAt: u.created_at,
              };
              setUser(profile);
              try {
                localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
              } catch {}
            } else {
              setUser(null);
              try { localStorage.removeItem(LOCAL_STORAGE_USER_KEY); } catch {}
            }
          })
          .catch((err) => {
            console.warn('Session getSession catch:', err);
            if (isMounted) {
              setUser(null);
              try { localStorage.removeItem(LOCAL_STORAGE_USER_KEY); } catch {}
            }
          })
          .finally(() => {
            if (isMounted) setLoading(false);
          });

        // Listen for Supabase auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!isMounted) return;
          if (session?.user) {
            const u = session.user;
            const profile: UserProfile = {
              id: u.id,
              email: u.email || '',
              fullName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'QA Engineer',
              role: u.user_metadata?.role || 'qa_engineer',
              companyName: u.user_metadata?.company_name || 'Industrial Facility',
              plantName: u.user_metadata?.plant_name || 'Main QA Lab',
              designation: u.user_metadata?.designation || 'Quality Engineer',
              createdAt: u.created_at,
            };
            setUser(profile);
            try {
              localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
            } catch {}
          } else {
            setUser(null);
            try { localStorage.removeItem(LOCAL_STORAGE_USER_KEY); } catch {}
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
        const profile: UserProfile = {
          id: u.id,
          email: u.email || email,
          fullName: u.user_metadata?.full_name || email.split('@')[0],
          role: u.user_metadata?.role || 'qa_engineer',
          companyName: u.user_metadata?.company_name || 'Industrial Facility',
          plantName: u.user_metadata?.plant_name || 'Main QA Lab',
          designation: u.user_metadata?.designation || 'Quality Engineer',
          createdAt: u.created_at,
        };
        setUser(profile);
        try {
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
        } catch {}
      }
      setLoading(false);
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
      setLoading(false);
      return { success: true };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    } catch {}
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    }
    setUser(null);
    setLoading(false);
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
    try {
      const response = await fetch('/api/account-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to submit account request.' };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Submit account request error:', err);
      return { success: false, error: err.message || 'Connection error. Please try again.' };
    }
  };

  const updateProfile = async (data: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      const updatedUser: UserProfile = {
        ...(user || {
          id: 'usr_' + Date.now(),
          email: '',
          fullName: 'QA Specialist',
        }),
        ...data,
      };

      setUser(updatedUser);

      // Persist to local storage
      try {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updatedUser));
      } catch (e) {
        // ignore
      }

      // If Supabase is connected, update metadata
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        if (supabase) {
          await supabase.auth.updateUser({
            data: {
              full_name: updatedUser.fullName,
              company_name: updatedUser.companyName,
              plant_name: updatedUser.plantName,
              designation: updatedUser.designation,
              role: updatedUser.role,
            },
          });
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('Update profile error:', err);
      return { success: false, error: err.message || 'Failed to update profile' };
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
        updateProfile,
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
