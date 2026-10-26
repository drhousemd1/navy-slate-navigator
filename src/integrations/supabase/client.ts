
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { logger } from '@/lib/logger';
import { resolveSupabaseConfiguration } from './configuration';

const SUPABASE_URL = "https://ronqvzihpffgowyscgfm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvbnF2emlocGZmZ293eXNjZ2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NzM0NzIsImV4cCI6MjA1ODQ0OTQ3Mn0.28ftEjZYpnYOywnRdRbRRg5UKD31VPpuZ00mJH8IQtM";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Existing hosted deployments retain their public configuration. Every other
// origin must explicitly select an isolated backend before a client is created.
const configuration = resolveSupabaseConfiguration(
  {
    VITE_BACKEND_TARGET: import.meta.env.VITE_BACKEND_TARGET,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  },
  typeof window === 'undefined' ? '' : window.location.hostname,
  { url: SUPABASE_URL, publishableKey: SUPABASE_PUBLISHABLE_KEY }
);

// Non-secret identity for durable work scoped to this already validated backend.
export const supabaseBackendId = configuration.url;

export const supabase = createClient<Database>(configuration.url, configuration.publishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});

// Helper function to check if a session exists (for debugging)
export const checkSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  logger.debug("Current session check:", data?.session ? "Session exists" : "No session", error);
  return data?.session;
};

// Debug helper to clear any corrupted auth state
export const clearAuthState = async () => {
  if (typeof window !== 'undefined') {
    // Clear any local storage items that might be causing issues
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.includes('supabase') || key?.includes('auth')) {
        logger.debug("Clearing potentially problematic storage item:", key);
        localStorage.removeItem(key);
      }
    }
  }
  
  // Sign out completely to reset auth state
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) {
    logger.error("Error clearing auth state:", error);
  } else {
    logger.debug("Auth state successfully cleared");
  }
};
