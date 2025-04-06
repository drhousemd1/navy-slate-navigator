
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ronqvzihpffgowyscgfm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvbnF2emlocGZmZ293eXNjZ2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NzM0NzIsImV4cCI6MjA1ODQ0OTQ3Mn0.28ftEjZYpnYOywnRdRbRRg5UKD31VPpuZ00mJH8IQtM";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Create a properly configured client
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
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
    // Clear any local storage items that might be causing issues
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.includes('supabase') || key?.includes('auth')) {
        console.log("Clearing potentially problematic storage item:", key);
        localStorage.removeItem(key);
      }
    }
  }
  
  // Sign out completely to reset auth state
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) {
    console.error("Error clearing auth state:", error);
  } else {
    console.log("Auth state successfully cleared");
  }
};

// Function to verify admin account exists and is ready
export const verifyAdminUser = async () => {
  try {
    console.log("Verifying admin account is ready for login");
    
    // Clear local storage first to avoid any conflicts
    await clearAuthState();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-demo-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from create-demo-user:', response.status, errorText);
      throw new Error(`Failed to verify admin account: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Admin verification response:', data);
    
    // If successful, display credentials information
    if (data.success && data.adminVerified) {
      toast?.({
        title: "Admin Account Ready",
        description: `Your admin account (${data.credentials.admin.email}) is confirmed and ready to use.`,
      });
      return true;
    } else if (!data.adminVerified) {
      toast?.({
        title: "Admin Account Issue",
        description: `Admin account not found. Please contact support.`,
        variant: "destructive"
      });
      return false;
    }
    
    return data;
  } catch (error) {
    console.error('Error verifying admin account:', error);
    toast?.({
      title: "Verification Error",
      description: `Failed to verify admin account: ${error.message}`,
      variant: "destructive"
    });
    return { success: false, error };
  }
};

// Add toast import
import { toast } from '@/hooks/use-toast';
