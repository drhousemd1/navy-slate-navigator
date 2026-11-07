import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { supabaseBackendId } from '@/integrations/supabase/client';
import { brandingTransport } from './api';
export const brandingCurrentKey = ['public-app-branding', supabaseBackendId] as const;
export function useCurrentLogo() {
  return useQuery({ queryKey: brandingCurrentKey, queryFn: ({ signal }) => brandingTransport.current(signal), staleTime: 0,
    refetchOnWindowFocus: true, retry: 1 });
}
export function useBrandingAccess(enabled = true, revision = 0) {
  const { user, loading } = useAuth();
  const account = !loading ? user?.id : undefined;
  const [state, setState] = useState<{ account: string; revision: number; status: 'allowed' | 'denied' | 'error' } | null>(null);
  useEffect(() => {
    setState(null);
    if (!enabled || !account) return;
    const controller = new AbortController();
    brandingTransport.access(account, controller.signal).then(allowed => {
      if (!controller.signal.aborted) setState({ account, revision, status: allowed ? 'allowed' : 'denied' });
    }, () => { if (!controller.signal.aborted) setState({ account, revision, status: 'error' }); });
    return () => controller.abort();
  }, [enabled, account, revision]);
  if (!enabled) return 'idle';
  if (loading) return 'loading';
  if (!account) return 'denied';
  if (!state || state.account !== account || state.revision !== revision) return 'loading';
  return state.status;
}
