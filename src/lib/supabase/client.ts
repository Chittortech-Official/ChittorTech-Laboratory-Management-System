import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_STORAGE_KEY = 'chittortech-qa-lms-supabase-auth';

declare global {
  // Preserve a single Supabase client across Next.js module reloads / HMR
  var __chittortechSupabaseClient: SupabaseClient | undefined;
}

const persistentStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage quota errors cleanly
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage removal errors cleanly
    }
  },
};

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return (
    typeof url === 'string' &&
    url.trim().length > 0 &&
    !url.includes('your-project') &&
    typeof key === 'string' &&
    key.trim().length > 0 &&
    !key.includes('your-anon-key')
  );
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (typeof window !== 'undefined' && globalThis.__chittortechSupabaseClient) {
    return globalThis.__chittortechSupabaseClient;
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  const client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: SUPABASE_STORAGE_KEY,
      storage: typeof window !== 'undefined' ? persistentStorage : undefined,
    },
  });

  if (typeof window !== 'undefined') {
    globalThis.__chittortechSupabaseClient = client;
  }

  return client;
};
