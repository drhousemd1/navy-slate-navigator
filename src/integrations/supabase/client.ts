
// Rewrite the supabase client singleton to be dynamically initialized,
// and provide a function to get the client based on current "rememberMe" preference.

// This approach avoids reading localStorage at module scope which can cause errors in SSR/environment without window.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ronqvzihpffgowyscgfm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvbnF2emlocGZmZ293eXNjZ2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NzM0NzIsImV4cCI6MjA1ODQ0OTQ3Mn0.28ftEjZYpnYOywnRdRbRRg5UKD31VPpuZ00mJH8IQtM";

let supabaseClient: SupabaseClient<Database> | null = null;

// Synchronously read rememberMe from localStorage safely, returns boolean
const getRememberMeSync = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('rememberMe') === 'true';
  } catch {
    return false;
  }
};

// Create new supabase client instance with given persistSession option
const createSupabaseClient = (persistSession: boolean) => {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      detectSessionInUrl: true,
    }
  });
};

// Export a function to get the singleton, initializing if needed dynamically
export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (!supabaseClient) {
    const persistSession = getRememberMeSync();
    supabaseClient = createSupabaseClient(persistSession);
  }
  return supabaseClient;
};

// Export a function to reset/recreate the client with a specified persistSession
export const resetSupabaseClientWithPersist = (persistSession: boolean): SupabaseClient<Database> => {
  supabaseClient = createSupabaseClient(persistSession);
  return supabaseClient;
};

// Helper function to clear auth state for sign-out; deprecated, but kept for compatibility
export const clearAuthState = async () => {
  if (typeof window !== 'undefined') {
    // Clean expected supabase auth local storage keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.includes('supabase') || key?.includes('auth')) {
        localStorage.removeItem(key);
      }
    }
  }
};

