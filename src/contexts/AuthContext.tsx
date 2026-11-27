'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { UserProfile, AuthState, AccountRequestPayload } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // Fixed 24 hours

interface SessionMeta {
  userId: string;
  loginAt: number;
  expiresAt: number;
}

interface AuthContextType extends AuthState {
  sessionLoginAt: number | null;
  sessionExpiresAt: number | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  submitAccountRequest: (payload: AccountRequestPayload) => Promise<{ success: boolean; requestId?: string; error?: string }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'chittortech_qa_lms_user';
const LOCAL_STORAGE_SESSION_META_KEY = 'chittortech_qa_lms_session_meta';

function readStoredUser(): UserProfile | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

function readStoredSessionMeta(): SessionMeta | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_SESSION_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionMeta;
    if (
      typeof parsed?.userId === 'string' &&
      typeof parsed?.loginAt === 'number' &&
      typeof parsed?.expiresAt === 'number'
    ) {
      return {
        userId: parsed.userId,
        loginAt: parsed.loginAt,
        expiresAt: Math.min(parsed.expiresAt, parsed.loginAt + SESSION_DURATION_MS),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function persistSessionLocally(profile: UserProfile, meta: SessionMeta): void {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
    window.localStorage.setItem(LOCAL_STORAGE_SESSION_META_KEY, JSON.stringify(meta));
  } catch {
    // Ignore storage quota errors
  }
}

function clearLocalSessionStorage(): void {
  try {
    window.localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    window.localStorage.removeItem(LOCAL_STORAGE_SESSION_META_KEY);
  } catch {
    // Ignore storage errors
  }
}

function mapSupabaseUser(u: {
  id: string;
  email?: string;
  created_at?: string;
  user_metadata?: Record<string, any>;
}): UserProfile {
  return {
    id: u.id,
    email: u.email || '',
    fullName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'QA Engineer',
    role: u.user_metadata?.role || 'qa_engineer',
    companyName: u.user_metadata?.company_name || 'Industrial Facility',
    plantName: u.user_metadata?.plant_name || 'Main QA Lab',
    designation: u.user_metadata?.designation || 'Quality Engineer',
    createdAt: u.created_at,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [sessionLoginAt, setSessionLoginAt] = useState<number | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);

  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const periodicCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionMetaRef = useRef<SessionMeta | null>(null);
  const explicitLogoutRef = useRef<boolean>(false);
  const expiryCleanupInFlightRef = useRef<boolean>(false);
  const nativeFetchRef = useRef<typeof window.fetch | null>(null);

  const clearTimers = useCallback(() => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
    if (periodicCheckRef.current) {
      clearInterval(periodicCheckRef.current);
      periodicCheckRef.current = null;
    }
  }, []);

  const fetchNative = useCallback((input: RequestInfo | URL, init?: RequestInit) => {
    const fn = nativeFetchRef.current || window.fetch.bind(window);
    return fn(input, init);
  }, []);

  const performSessionTermination = useCallback(async (notifyServer: boolean) => {
    if (expiryCleanupInFlightRef.current) return;
    expiryCleanupInFlightRef.current = true;
    explicitLogoutRef.current = true;

    try {
      clearTimers();
      sessionMetaRef.current = null;
      setSessionLoginAt(null);
      setSessionExpiresAt(null);
      setUser(null);
      setLoading(false);
      clearLocalSessionStorage();

      if (notifyServer) {
        await fetchNative('/api/auth/session', {
          method: 'DELETE',
          credentials: 'same-origin',
        }).catch(() => {});
      }

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        if (supabase) {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        }
      }
    } finally {
      expiryCleanupInFlightRef.current = false;
      setTimeout(() => {
        explicitLogoutRef.current = false;
      }, 1000);
    }
  }, [clearTimers, fetchNative]);

  const applyAuthenticatedState = useCallback(
    (profile: UserProfile, loginAt: number, expiresAt: number) => {
      const strictExpiry = Math.min(expiresAt, loginAt + SESSION_DURATION_MS);
      if (Date.now() >= strictExpiry) {
        void performSessionTermination(true);
        return;
      }

      const meta: SessionMeta = {
        userId: profile.id,
        loginAt,
        expiresAt: strictExpiry,
      };
      sessionMetaRef.current = meta;
      setUser(profile);
      setSessionLoginAt(loginAt);
      setSessionExpiresAt(strictExpiry);
      persistSessionLocally(profile, meta);

      clearTimers();
      const remainingMs = Math.max(0, strictExpiry - Date.now());
      expiryTimerRef.current = setTimeout(() => {
        void performSessionTermination(true);
      }, remainingMs);

      // Re-check every 60s in case system clock jumped or browser slept past 24h
      periodicCheckRef.current = setInterval(() => {
        const activeMeta = sessionMetaRef.current;
        if (activeMeta && Date.now() >= activeMeta.expiresAt) {
          void performSessionTermination(true);
        }
      }, 60_000);
    },
    [clearTimers, performSessionTermination]
  );

  const validateServerSession = useCallback(async (): Promise<{
    authenticated: boolean;
    expired?: boolean;
    networkError?: boolean;
    user?: UserProfile;
    loginAt?: number;
    expiresAt?: number;
  }> => {
    try {
      const res = await fetchNative('/api/auth/session', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!res.ok) {
        return { authenticated: false };
      }
      return await res.json();
    } catch {
      return { authenticated: false, networkError: true };
    }
  }, [fetchNative]);

  useEffect(() => {
    let isMounted = true;
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);

    // Intercept same-origin API 401 SESSION_EXPIRED responses automatically
    if (typeof window !== 'undefined' && !nativeFetchRef.current) {
      const originalFetch = window.fetch.bind(window);
      nativeFetchRef.current = originalFetch;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const response = await originalFetch(input, init);
        if (response.status === 401) {
          try {
            const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
            const path = urlStr.startsWith('http') ? new URL(urlStr).pathname : urlStr;
            if (path.startsWith('/api/') && !path.startsWith('/api/auth/')) {
              void performSessionTermination(true);
            }
          } catch {
            // Ignore URL parse issues
          }
        }
        return response;
      };
    }

    const initializeSession = async () => {
      // 1. Optimistically read local persistent storage (never wiped on tab close or refresh)
      const cachedUser = readStoredUser();
      const cachedMeta = readStoredSessionMeta();

      if (cachedMeta && Date.now() >= cachedMeta.expiresAt) {
        await performSessionTermination(true);
        if (isMounted) setLoading(false);
        return;
      }

      if (cachedUser && cachedMeta && cachedMeta.userId === cachedUser.id && Date.now() < cachedMeta.expiresAt) {
        setUser(cachedUser);
        setSessionLoginAt(cachedMeta.loginAt);
        setSessionExpiresAt(cachedMeta.expiresAt);
        sessionMetaRef.current = cachedMeta;
      }

      // 2. Authoritative server check (HttpOnly signed 24h cookie)
      const serverCheck = await validateServerSession();
      if (!isMounted) return;

      if (serverCheck.authenticated && serverCheck.user && serverCheck.loginAt && serverCheck.expiresAt) {
        applyAuthenticatedState(serverCheck.user, serverCheck.loginAt, serverCheck.expiresAt);
        setLoading(false);
        return;
      }

      if (serverCheck.expired) {
        await performSessionTermination(false);
        if (isMounted) setLoading(false);
        return;
      }

      if (serverCheck.networkError && cachedUser && cachedMeta && Date.now() < cachedMeta.expiresAt) {
        applyAuthenticatedState(cachedUser, cachedMeta.loginAt, cachedMeta.expiresAt);
        setLoading(false);
        return;
      }

      // 3. Server cookie not yet set — restore from persistent Supabase session only if within original 24h
      if (configured) {
        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            const { data } = await supabase.auth.getSession();
            if (!isMounted) return;
            if (data?.session?.access_token && data?.session?.user) {
              const syncRes = await fetchNative('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                  mode: 'restore',
                  accessToken: data.session.access_token,
                }),
              });
              const syncData = await syncRes.json().catch(() => ({}));
              if (!isMounted) return;

              if (syncRes.ok && syncData.authenticated && syncData.user) {
                applyAuthenticatedState(syncData.user, syncData.loginAt, syncData.expiresAt);
                setLoading(false);
                return;
              }
            }
          } catch {
            // Transient network error: if valid local meta exists inside 24h window, preserve temporarily
            if (cachedUser && cachedMeta && Date.now() < cachedMeta.expiresAt) {
              applyAuthenticatedState(cachedUser, cachedMeta.loginAt, cachedMeta.expiresAt);
              setLoading(false);
              return;
            }
          }
        }
      }

      // No valid unexpired session anywhere
      await performSessionTermination(false);
      if (isMounted) setLoading(false);
    };

    void initializeSession();

    // Listen to Supabase auth state changes WITHOUT extending the 24h window or wiping valid sessions on hiccups
    let subscription: { unsubscribe: () => void } | null = null;
    if (configured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const res = supabase.auth.onAuthStateChange((event, session) => {
          if (!isMounted) return;

          if (event === 'SIGNED_OUT') {
            if (explicitLogoutRef.current) {
              return;
            }
            // Verify with authoritative server cookie before logging out (protects against cross-tab refresh races)
            void validateServerSession().then((serverCheck) => {
              if (!isMounted) return;
              if (!serverCheck.authenticated) {
                void performSessionTermination(false);
              }
            });
            return;
          }

          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
            const activeMeta = sessionMetaRef.current || readStoredSessionMeta();
            if (activeMeta && Date.now() >= activeMeta.expiresAt) {
              void performSessionTermination(true);
              return;
            }
            if (activeMeta && activeMeta.userId === session.user.id) {
              // Strictly preserve original loginAt and expiresAt on token refresh (no sliding extension)
              applyAuthenticatedState(mapSupabaseUser(session.user), activeMeta.loginAt, activeMeta.expiresAt);
            }
          }
        });
        subscription = res.data.subscription;
      }
    }

    // Re-check expiry when user switches back to tab or wakes browser from sleep
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'hidden') return;
      const activeMeta = sessionMetaRef.current || readStoredSessionMeta();
      if (activeMeta && Date.now() >= activeMeta.expiresAt) {
        void performSessionTermination(true);
      } else if (activeMeta) {
        void validateServerSession().then((serverCheck) => {
          if (!isMounted) return;
          if (!serverCheck.authenticated && (serverCheck.expired || !sessionMetaRef.current)) {
            void performSessionTermination(false);
          }
        });
      }
    };

    // Sync explicit logout or login across open browser tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== LOCAL_STORAGE_USER_KEY && e.key !== LOCAL_STORAGE_SESSION_META_KEY) return;
      const nextUser = readStoredUser();
      const nextMeta = readStoredSessionMeta();
      if (!nextUser || !nextMeta || Date.now() >= nextMeta.expiresAt) {
        clearTimers();
        sessionMetaRef.current = null;
        setUser(null);
        setSessionLoginAt(null);
        setSessionExpiresAt(null);
      } else {
        applyAuthenticatedState(nextUser, nextMeta.loginAt, nextMeta.expiresAt);
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      isMounted = false;
      clearTimers();
      subscription?.unsubscribe();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('storage', handleStorageChange);
      if (nativeFetchRef.current) {
        window.fetch = nativeFetchRef.current;
        nativeFetchRef.current = null;
      }
    };
  }, [applyAuthenticatedState, clearTimers, fetchNative, performSessionTermination, validateServerSession]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    explicitLogoutRef.current = false;

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return { success: false, error: 'Database connection unavailable' };

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data?.user || !data?.session?.access_token) {
        return { success: false, error: error?.message || 'Invalid credentials' };
      }

      const sessionRes = await fetchNative('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          mode: 'login',
          accessToken: data.session.access_token,
        }),
      });
      const sessionData = await sessionRes.json().catch(() => ({}));

      if (!sessionRes.ok || !sessionData.authenticated) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        return { success: false, error: sessionData.error || 'Failed to establish authenticated session.' };
      }

      applyAuthenticatedState(sessionData.user, sessionData.loginAt, sessionData.expiresAt);
      setLoading(false);
      return { success: true };
    } else {
      // Local fallback development authentication (enforces same fixed 24h server cookie)
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

      const sessionRes = await fetchNative('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          mode: 'login',
          user: mockUser,
        }),
      });
      const sessionData = await sessionRes.json().catch(() => ({}));

      if (!sessionRes.ok || !sessionData.authenticated) {
        return { success: false, error: sessionData.error || 'Failed to establish local session.' };
      }

      applyAuthenticatedState(sessionData.user, sessionData.loginAt, sessionData.expiresAt);
      setLoading(false);
      return { success: true };
    }
  };

  const logout = async (): Promise<void> => {
    await performSessionTermination(true);
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

  const submitAccountRequest = async (payload: AccountRequestPayload): Promise<{ success: boolean; requestId?: string; error?: string }> => {
    try {
      const response = await fetchNative('/api/account-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to submit account request.' };
      }

      return { success: true, requestId: data.requestId };
    } catch (err: any) {
      console.error('Submit account request error:', err);
      return { success: false, error: err.message || 'Connection error. Please try again.' };
    }
  };

  const updateProfile = async (data: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      const activeMeta = sessionMetaRef.current || readStoredSessionMeta();
      if (!activeMeta || Date.now() >= activeMeta.expiresAt) {
        await performSessionTermination(true);
        return { success: false, error: 'Session expired. Please sign in again.' };
      }

      const updatedUser: UserProfile = {
        ...(user || {
          id: activeMeta.userId,
          email: '',
          fullName: 'QA Specialist',
        }),
        ...data,
      };

      setUser(updatedUser);
      persistSessionLocally(updatedUser, activeMeta);

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
          const { data: sess } = await supabase.auth.getSession();
          if (sess?.session?.access_token) {
            await fetchNative('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({
                mode: 'profile-sync',
                accessToken: sess.session.access_token,
              }),
            }).catch(() => {});
          }
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
        sessionLoginAt,
        sessionExpiresAt,
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
