
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Synchronously read rememberMe flag outside React rendering
const getRememberMeSync = (): boolean => {
  try {
    return localStorage.getItem('rememberMe') === 'true';
  } catch {
    return false;
  }
};

const initialPersistSession = getRememberMeSync();

const SUPABASE_URL = "https://ronqvzihpffgowyscgfm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvbnF2emlocGZmZ293eXNjZ2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NzM0NzIsImV4cCI6MjA1ODQ0OTQ3Mn0.28ftEjZYpnYOywnRdRbRRg5UKD31VPpuZ00mJH8IQtM";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: initialPersistSession,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    detectSessionInUrl: true,
  }
});

// Exporting a function to recreate client with updated persistSession if needed (use cautiously)
export const initializeSupabaseClient = (persistSession = initialPersistSession) => {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      detectSessionInUrl: true,
    }
  });
};

// Helper function to clear auth state for sign-out
export const clearAuthState = async () => {
  if (typeof window !== 'undefined') {
    // Clean expected supabase auth local storage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.includes('supabase') || key?.includes('auth')) {
        localStorage.removeItem(key);
      }
    }
  }
  
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) {
    console.error("Error clearing auth state:", error);
  }
};
