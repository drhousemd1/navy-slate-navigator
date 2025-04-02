
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ronqvzihpffgowyscgfm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvbnF2emlocGZmZ293eXNjZ2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NzM0NzIsImV4cCI6MjA1ODQ0OTQ3Mn0.28ftEjZYpnYOywnRdRbRRg5UKD31VPpuZ00mJH8IQtM";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: localStorage
  }
});

// Debug session persistence
if (typeof window !== 'undefined') {
  // Check localStorage on load
  console.log('localStorage auth session on load:', localStorage.getItem('sb-auth-token'));
  
  // Periodically check for session to debug persistence issues
  setInterval(() => {
    supabase.auth.getSession().then(({ data }) => {
      console.log('Current session check:', data.session ? 'Active' : 'None');
    });
  }, 15000);
}
