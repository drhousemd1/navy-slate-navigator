import { signOutOwnedSession, notifyOwnedSignOut, sessionOwner } from '@/lib/ownedSignOut';
import type { Session } from '@supabase/supabase-js';

import { deletionAwareAuthStorage, removeDeletedAccountSession } from '@/data/accountDeletion/authStorage';
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
// Public gateway key for explicitly scoped Edge requests, including recovery
// operations that intentionally work after the deleted Auth session is gone.
export const supabasePublicKey = configuration.publishableKey;

// Explicitly retain the installed SDK's existing default storage key.
export const supabaseAuthStorageKey = `sb-${new URL(configuration.url).hostname.split('.')[0]}-auth-token`;
export const clearDeletedAccountSession = (account: string) => removeDeletedAccountSession(supabaseBackendId, supabaseAuthStorageKey, account);

export const supabase = createClient<Database>(configuration.url, configuration.publishableKey, {
  auth: {
    storageKey: supabaseAuthStorageKey,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? deletionAwareAuthStorage(supabaseBackendId, supabaseAuthStorageKey, window.localStorage) : undefined
  }
});

// Helper function to check if a session exists (for debugging)
export const checkSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  logger.debug("Current session check:", data?.session ? "Session exists" : "No session", error);
  return data?.session;
};

/** Explicit-token Realtime setAuth has no awaited storage read in the installed
 * SDK. Read and choose synchronously so old cleanup cannot downgrade a newer login. */
export const synchronizeRealtimeSession = () => {
  const storage = deletionAwareAuthStorage(supabaseBackendId, supabaseAuthStorageKey, localStorage);
  const raw = storage.getItem(supabaseAuthStorageKey);
  let session: Session | null = null; try { session = raw ? JSON.parse(raw) : null; } catch { /* Unknown bytes are never adopted. */ }
  const token = sessionOwner(supabaseBackendId, session) ? session!.access_token : supabasePublicKey;
  void supabase.realtime.setAuth(token).catch(error => logger.error('Realtime session synchronization failed:', error));
};

/** Ordinary logout affects only the captured session, never a later login. */
export const signOutCurrentSession = (session: Session) => signOutOwnedSession(session, {
  backendId: supabaseBackendId, storageKey: supabaseAuthStorageKey, storage: localStorage, locks: globalThis.navigator?.locks,
  revoke: (jwt, scope) => supabase.auth.admin.signOut(jwt, scope), notify: notifyOwnedSignOut,
});

// The existing debug reset obeys the same ownership boundary. Unknown corrupt
// bytes cannot be assigned to an account and are left for explicit recovery.
export const clearAuthState = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) await signOutCurrentSession(data.session);
};
