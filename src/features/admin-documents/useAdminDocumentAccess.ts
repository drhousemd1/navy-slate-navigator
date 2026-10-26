import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AdminDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Functions'> & {
    Functions: Database['public']['Functions'] & {
      can_read_admin_document: { Args: Record<string, never>; Returns: boolean };
    };
  };
};

// Reuse the existing authenticated client; no second session or cached role flag.
const adminClient = supabase as unknown as SupabaseClient<AdminDatabase>;
type AccessState = { userId: string; revision: number; status: 'allowed' | 'denied' | 'error' };

export function useAdminDocumentAccess(enabled = true, revision = 0) {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState<AccessState | null>(null);

  useEffect(() => {
    if (!enabled || !userId || loading) return;
    let active = true;
    adminClient.rpc('can_read_admin_document', {}).then(({ data, error }) => {
      if (active) setState({ userId, revision, status: error ? 'error' : data === true ? 'allowed' : 'denied' });
    }, () => {
      if (active) setState({ userId, revision, status: 'error' });
    });
    return () => { active = false; };
  }, [enabled, userId, loading, revision]);

  if (!enabled) return 'idle';
  if (loading) return 'loading';
  if (!userId) return 'denied';
  if (!state || state.userId !== userId || state.revision !== revision) return 'loading';
  return state.status;
}
