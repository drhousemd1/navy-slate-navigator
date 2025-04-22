
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Supabase client configuration
const supabaseUrl = "https://ronqvzihpffgowyscgfm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvbnF2emlocGZmZ293eXNjZ2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NzM0NzIsImV4cCI6MjA1ODQ0OTQ3Mn0.28ftEjZYpnYOywnRdRbRRg5UKD31VPpuZ00mJH8IQtM";

// Create a properly configured client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
  console.log("Current session check:", data?.session ? "Session exists" : "No session", error);
  return data?.session;
};

// Debug helper to clear any corrupted auth state
export const clearAuthState = async () => {
  if (typeof window !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.includes('supabase') || key?.includes('auth')) {
        console.log("Clearing potentially problematic storage item:", key);
        localStorage.removeItem(key);
      }
    }
  }
  
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) {
    console.error("Error clearing auth state:", error);
  } else {
    console.log("Auth state successfully cleared");
  }
};
