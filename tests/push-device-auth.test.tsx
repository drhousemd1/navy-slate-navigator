import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  revoke: vi.fn(), signOut: vi.fn(), toast: vi.fn(), listener: null as null | ((event: string, session: unknown) => Promise<void>),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://auth.invalid', supabase: { auth: {
  getSession: async () => ({ data: { session: { user: { id: 'A' } } }, error: null }),
  onAuthStateChange: (callback: typeof mocks.listener) => { mocks.listener = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
  signOut: mocks.signOut,
} } }));
vi.mock('@/lib/pushDevice', () => ({ revokeCurrentPushDeviceBeforeSignOut: mocks.revoke }));
vi.mock('@/lib/offline/recovery', () => ({ forgetRecovery: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/data/queryClient', () => ({ queryClient: { clear: vi.fn() } }));
vi.mock('@/hooks/useFormStatePersister', () => ({ STORAGE_PREFIX: 'forms:' }));
vi.mock('@/contexts/auth/useAuthOperations', () => ({ useAuthOperations: () => ({}) }));
vi.mock('@/contexts/auth/useUserProfile', () => ({ useUserProfile: () => ({}) }));
vi.mock('@/contexts/auth/usePartnerLinking', () => ({ usePartnerLinking: () => ({ relationshipIdentity: {} }) }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() } }));
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function Consumer() {
  const auth = useAuth();
  return <><p>{auth.user?.id ?? 'signed out'}</p><button onClick={() => void auth.signOut()}>Sign out</button></>;
}
beforeEach(() => {
  mocks.revoke.mockReset().mockResolvedValue('revoked'); mocks.signOut.mockReset().mockResolvedValue({ error: null });
  mocks.toast.mockReset(); mocks.listener = null;
});
afterEach(cleanup);

describe('AuthProvider current-device sign-out integration', () => {
  it.each(['revoked', 'not_registered', 'unconfirmed'])('continues signing out after device result %s', async status => {
    mocks.revoke.mockResolvedValue(status);
    render(<AuthProvider><Consumer /></AuthProvider>); await screen.findByText('A');
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    expect(mocks.revoke).toHaveBeenCalledWith('A');
    expect(mocks.revoke.mock.invocationCallOrder[0]).toBeLessThan(mocks.signOut.mock.invocationCallOrder[0]);
    if (status === 'unconfirmed') expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Device notifications not confirmed off' }));
    else expect(mocks.toast).not.toHaveBeenCalled();
  });
  it('does not sign out an account that changed while revocation was pending', async () => {
    let resolve!: (result: string) => void;
    mocks.revoke.mockReturnValue(new Promise<string>(yes => { resolve = yes; }));
    render(<AuthProvider><Consumer /></AuthProvider>); await screen.findByText('A');
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(mocks.revoke).toHaveBeenCalledWith('A'));
    await act(async () => { await mocks.listener!('SIGNED_IN', { user: { id: 'B' } }); });
    await screen.findByText('B');
    await act(async () => { resolve('revoked'); });
    expect(mocks.signOut).not.toHaveBeenCalled(); expect(mocks.toast).not.toHaveBeenCalled();
  });
});
