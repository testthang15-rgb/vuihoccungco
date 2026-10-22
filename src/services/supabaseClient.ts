import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables or localStorage fallbacks for easy configuration in browser
const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ENV_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  let url = ENV_SUPABASE_URL;
  let anonKey = ENV_SUPABASE_ANON_KEY;

  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('vuihoc_supabase_url');
    const savedKey = localStorage.getItem('vuihoc_supabase_anon_key');
    if (savedUrl && savedUrl.trim()) url = savedUrl.trim();
    if (savedKey && savedKey.trim()) anonKey = savedKey.trim();
  }

  return { url, anonKey };
}

export function saveStoredSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  if (url.trim()) {
    localStorage.setItem('vuihoc_supabase_url', url.trim());
  } else {
    localStorage.removeItem('vuihoc_supabase_url');
  }

  if (anonKey.trim()) {
    localStorage.setItem('vuihoc_supabase_anon_key', anonKey.trim());
  } else {
    localStorage.removeItem('vuihoc_supabase_anon_key');
  }
  // Re-instantiate client
  initSupabaseClient();
}

let supabaseInstance: SupabaseClient | null = null;

export function initSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseConfig();

  if (!url || !anonKey) {
    supabaseInstance = null;
    return null;
  }

  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    });
    return supabaseInstance;
  } catch (err) {
    console.error('[Supabase] Failed to initialize client:', err);
    supabaseInstance = null;
    return null;
  }
}

// Initial instance
supabaseInstance = initSupabaseClient();

export function getSupabase(): SupabaseClient | null {
  if (!supabaseInstance) {
    supabaseInstance = initSupabaseClient();
  }
  return supabaseInstance;
}

export function isSupabaseReady(): boolean {
  const { url, anonKey } = getStoredSupabaseConfig();
  return Boolean(url && anonKey);
}
