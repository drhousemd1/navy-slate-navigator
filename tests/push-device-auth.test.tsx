import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  revoke: vi.fn(), signOut: vi.fn(), toast: vi.fn(), listener: null as null | ((event: string, session: unknown) => Promise<void>),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://auth.invalid', supabaseAuthStorageKey: 'sb-auth-auth-token', signOutCurrentSession: mocks.signOut, synchronizeRealtimeSession: vi.fn(), supabase: { auth: {
  getSession: async () => ({ data: { session: makeSession('A') }, error: null }),
  onAuthStateChange: (callback: typeof mocks.listener) => { mocks.listener = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
  signOut: mocks.signOut,
} } }));
vi.mock('@/lib/pushDevice', () => ({ revokeCurrentPushDeviceBeforeSignOut: mocks.revoke }));
vi.mock('@/lib/offline/recovery', () => ({ forgetAccountRecovery: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/data/queryClient', () => ({ queryClient: { clear: vi.fn(), cancelQueries: vi.fn(async () => {}), removeQueries: vi.fn() } }));
vi.mock('@/hooks/useFormStatePersister', () => ({ STORAGE_PREFIX: 'forms:' }));
vi.mock('@/contexts/auth/useAuthOperations', () => ({ useAuthOperations: () => ({}) }));
vi.mock('@/contexts/auth/useUserProfile', () => ({ useUserProfile: () => ({}) }));
vi.mock('@/contexts/auth/usePartnerLinking', () => ({ usePartnerLinking: () => ({ relationshipIdentity: {} }) }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock('@/contexts/auth/useAccountDeletion', () => ({ useAccountDeletion: () => ({ records: [], loading: false, loadError: null }) }));
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function makeSession(account: string, id = 'session-1') { return { user: { id: account }, access_token: `e30.${btoa(JSON.stringify({ sub: account, session_id: id }))}.sig` }; }
function Consumer() {
  const auth = useAuth();
  return <><p>{auth.user?.id ?? 'signed out'}</p><button onClick={() => void auth.signOut()}>Sign out</button></>;
}
beforeEach(() => {
  localStorage.clear(); vi.stubGlobal('BroadcastChannel', undefined);
  mocks.revoke.mockReset().mockResolvedValue('revoked'); mocks.signOut.mockReset().mockResolvedValue('removed');
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
    await act(async () => { await mocks.listener!('SIGNED_IN', makeSession('B')); });
    await screen.findByText('B');
    await act(async () => { resolve('revoked'); });
    expect(mocks.signOut).not.toHaveBeenCalled(); expect(mocks.toast).not.toHaveBeenCalled();
  });
  it('does not revoke a replacement same-account session while push-device cleanup waits', async () => {
    let resolve!: (result: string) => void; mocks.revoke.mockReturnValue(new Promise<string>(yes => { resolve = yes; }));
    render(<AuthProvider><Consumer /></AuthProvider>); await screen.findByText('A'); fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await act(async () => { await mocks.listener!('SIGNED_IN', makeSession('A', 'new-session')); resolve('revoked'); });
    expect(mocks.signOut).not.toHaveBeenCalled(); expect(screen.getByText('A')).toBeTruthy();
  });
  it('ignores a generic old SDK sign-out event while storage holds a valid replacement', async () => {
    render(<AuthProvider><Consumer /></AuthProvider>); await screen.findByText('A');
    await act(async () => { const b = makeSession('B'); localStorage.setItem('sb-auth-auth-token', JSON.stringify(b)); await mocks.listener!('SIGNED_IN', b); await mocks.listener!('SIGNED_OUT', null); });
    expect(screen.getByText('B')).toBeTruthy(); expect(mocks.signOut).not.toHaveBeenCalled();
  });
  it('ignores delayed owned sign-out events for another account or another session of this account', async () => {
    render(<AuthProvider><Consumer /></AuthProvider>); await screen.findByText('A');
    await act(async () => { await mocks.listener!('SIGNED_IN', makeSession('A', 'new-session')); });
    await act(async () => { window.dispatchEvent(new CustomEvent('obedience:session-ended', { detail: { backendId: 'https://auth.invalid', accountId: 'A', sessionId: 'session-1' } })); });
    expect(screen.getByText('A')).toBeTruthy();
    await act(async () => { window.dispatchEvent(new CustomEvent('obedience:session-ended', { detail: { backendId: 'https://auth.invalid', accountId: 'A', sessionId: 'new-session' } })); });
    expect(screen.getByText('signed out')).toBeTruthy();
  });
  it('keeps unidentified disk bytes and a new login when old sign-out finishes late', async () => {
    let finish!: (value: string) => void; mocks.signOut.mockReturnValue(new Promise<string>(yes => { finish = yes; }));
    localStorage.setItem('kingdom-app-form-old', 'unknown'); localStorage.setItem('pending-action', 'keep');
    render(<AuthProvider><Consumer /></AuthProvider>); await screen.findByText('A'); fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    await act(async () => { await mocks.listener!('SIGNED_IN', makeSession('B')); finish('replacement'); });
    expect(screen.getByText('B')).toBeTruthy(); expect(localStorage.getItem('kingdom-app-form-old')).toBe('unknown'); expect(localStorage.getItem('pending-action')).toBe('keep');
  });

});
