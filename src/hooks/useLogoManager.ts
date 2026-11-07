import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { BrandingError, brandingErrorText, brandingTransport } from '@/data/branding/api';
import { brandingCurrentKey, useBrandingAccess, useCurrentLogo } from '@/data/branding/queries';
import type { LogoHistory, LogoIntent } from '@/data/branding/schema';
import { prepareLogo } from '@/utils/logoUpload';

type OwnerState = { account: string; history: LogoHistory | null; file: File | null; pending: LogoIntent | null; busy: boolean; error: string; notice: string };
const empty = (account: string): OwnerState => ({ account, history: null, file: null, pending: null, busy: false, error: '', notice: '' });
export function useLogoManager() {
  const { user, loading } = useAuth();
  const account = !loading ? user?.id ?? '' : '';
  const current = useCurrentLogo();
  const queryClient = useQueryClient();
  const [accessRevision, setAccessRevision] = useState(0);
  const access = useBrandingAccess(true, accessRevision);
  const [state, setState] = useState<OwnerState>(() => empty(account));
  const stateRef = useRef(state); stateRef.current = state;
  const owner = useRef(account); owner.current = account;
  const inflight = useRef<AbortController | null>(null);
  const active = state.account === account ? state : empty(account);
  const update = (captured: string, patch: Partial<OwnerState>) => {
    if (owner.current === captured) setState(value => ({ ...(value.account === captured ? value : empty(captured)), ...patch }));
  };
  useEffect(() => {
    setState(empty(account));
    return () => { inflight.current?.abort(); inflight.current = null; };
  }, [account]);
  useEffect(() => {
    if (!account || access !== 'allowed') return;
    const controller = new AbortController();
    brandingTransport.history(account, controller.signal).then(history => {
      if (!controller.signal.aborted) update(account, { history, error: '' });
    }, error => { if (!controller.signal.aborted) update(account, { history: null, error: brandingErrorText(error) }); });
    return () => controller.abort();
  }, [account, access, accessRevision]);

  async function perform(file?: File, versionId?: string) {
    if (!account || access !== 'allowed' || inflight.current) return;
    const captured = account, controller = new AbortController(); inflight.current = controller;
    const previous = stateRef.current.account === captured ? stateRef.current : empty(captured);
    if (!previous.history) { inflight.current = null; return; }
    const stillCurrent = () => owner.current === captured && !controller.signal.aborted;
    update(captured, { busy: true, error: '', notice: '', ...(file ? { file, pending: null } : {}) });
    try {
      let intent = !file && !versionId ? previous.pending : null;
      if (!intent) {
        if (versionId) {
          intent = { kind: 'restore', versionId, commandId: crypto.randomUUID(), expectedRevision: previous.history.current.revision };
        } else {
          const selected = file ?? previous.file;
          if (!selected) return;
          const blob = await prepareLogo(selected);
          if (!stillCurrent()) return;
          intent = { kind: 'upload', blob, commandId: crypto.randomUUID(), expectedRevision: previous.history.current.revision };
        }
        update(captured, { pending: intent });
      }
      await brandingTransport.write(captured, intent, controller.signal);
      if (!stillCurrent()) return;
      update(captured, { pending: null, file: null, notice: intent.kind === 'restore' ? 'Previous logo restored for everyone.' : 'Shared logo updated for everyone.' });
      void queryClient.invalidateQueries({ queryKey: brandingCurrentKey });
      const history = await brandingTransport.history(captured, controller.signal);
      if (stillCurrent()) update(captured, { history });
    } catch (error) {
      if (!stillCurrent()) return;
      update(captured, { error: error instanceof BrandingError ? brandingErrorText(error) : error instanceof Error ? error.message : brandingErrorText(error) });
      if (error instanceof BrandingError && error.code === 'LOGO_REVISION_CONFLICT') {
        // The rejected command changed nothing. Preserve the selected file, show
        // the latest state, and require review before creating a new command.
        update(captured, { pending: null });
        try { const history = await brandingTransport.history(captured, controller.signal); if (stillCurrent()) update(captured, { history }); }
        catch { if (stillCurrent()) update(captured, { history: null }); }
        void queryClient.invalidateQueries({ queryKey: brandingCurrentKey });
      }
      if (error instanceof BrandingError && ['BRANDING_OWNER_REQUIRED','ACCOUNT_UNAVAILABLE','ACCOUNT_CHANGED'].includes(error.code)) {
        update(captured, { history: null, pending: null }); setAccessRevision(value => value + 1);
      }
    } finally {
      if (stillCurrent()) update(captured, { busy: false });
      if (inflight.current === controller) inflight.current = null;
    }
  }
  return { ...active, access, current, upload: (file: File) => perform(file), restore: (id: string) => perform(undefined, id),
    retry: () => perform(), refresh: () => { if (!inflight.current) { setAccessRevision(value => value + 1); void current.refetch(); } } };
}
