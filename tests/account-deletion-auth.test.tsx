import React, { useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ rows: new Map(), session: null as null | { user: { id: string } }, listener: null as null | ((event: string, session: unknown) => Promise<void>),
  clearSession: vi.fn(), start: vi.fn(), status: vi.fn(), resume: vi.fn(), purge: vi.fn(), clear: vi.fn(), signOut: vi.fn(), removeItem: vi.fn(), writers: new Set<string>() }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://deletion.invalid', supabaseAuthStorageKey: 'sb-deletion-auth-token', supabasePublicKey: 'public', clearDeletedAccountSession: f.clearSession, supabase: { auth: {
  getSession: async () => ({ data: { session: f.session }, error: null }), onAuthStateChange: (callback: typeof f.listener) => { f.listener = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; }, signOut: f.signOut,
} } }));
vi.mock('@/data/accountDeletion/store', () => ({ deletionStore: {
  list: async () => [...f.rows.values()], save: async (row: { key: string }) => { f.rows.set(row.key, structuredClone(row)); }, remove: async (row: { key: string }) => { f.rows.delete(row.key); },
} }));
vi.mock('@/data/accountDeletion/api', async original => ({ ...await original<typeof import('@/data/accountDeletion/api')>(), deletionTransport: { start: f.start, status: f.status, resume: f.resume } }));
vi.mock('@/data/accountDeletion/cleanup', () => ({ cleanupDeletedAccount: f.purge }));
vi.mock('@/data/queryClient', () => ({ queryClient: { clear: f.clear } }));
vi.mock('localforage', () => ({ default: { removeItem: f.removeItem, keys: async () => [] } }));
vi.mock('@/lib/pushDevice', () => ({ revokeCurrentPushDeviceBeforeSignOut: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/hooks/useFormStatePersister', () => ({ STORAGE_PREFIX: 'kingdom-app-form-' }));
vi.mock('@/contexts/auth/useAuthOperations', () => ({ useAuthOperations: () => ({}) }));
vi.mock('@/contexts/auth/useUserProfile', () => ({ useUserProfile: () => ({}) }));
vi.mock('@/contexts/auth/useRoleTransitions', () => ({ useRoleTransitions: () => ({}) }));
vi.mock('@/contexts/auth/usePartnerLinking', () => ({ usePartnerLinking: (user: { id: string } | null) => ({ relationshipIdentity: {
  currentUserId: user?.id ?? null, canAccessData: !!user, relationshipId: '30000000-0000-4000-8000-000000000002', relationshipSessionId: '30000000-0000-4000-8000-000000000003',
} }) }));
vi.mock('@/pages/auth/LoginSignupView', () => ({ LoginSignupView: () => <p>Sign in form</p> }));
vi.mock('@/pages/auth/ForgotPasswordView', () => ({ ForgotPasswordView: () => <p>Recovery form</p> }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() } }));
import { AuthProvider, useAuth, type AuthContextType } from '@/contexts/AuthContext';
import Auth from '@/pages/auth';
import { complete, deferred, id, pending, scope } from './account-deletion.helpers';
import { removeDeletedAccountSession } from '@/data/accountDeletion/authStorage';
import { markDeletedAccount } from '@/data/accountDeletion/tombstone';
import type { DeletionStatus } from '@/data/accountDeletion/types';
let auth: AuthContextType;
function Writer({ account }: { account: string }) { useEffect(() => { f.writers.add(account); return () => { f.writers.delete(account); }; }, [account]); return <p>Account {account}</p>; }
function Consumer() { auth = useAuth(); return auth.user ? <><Writer account={auth.user.id} /><button onClick={() => void auth.accountDeletion.start()}>Confirm deletion</button></> : <Auth />; }
const renderApp = () => render(<AuthProvider><MemoryRouter><Consumer /></MemoryRouter></AuthProvider>);
beforeEach(() => {
  vi.stubGlobal('BroadcastChannel', undefined);
  localStorage.clear(); localStorage.setItem('sb-deletion-auth-token', JSON.stringify({ user: { id: scope.accountId } }));
  f.rows.clear(); f.writers.clear(); f.clear.mockReset(); f.removeItem.mockReset(); f.session = { user: { id: scope.accountId } };
  f.start.mockReset().mockImplementation(async row => pending(row.jobId)); f.status.mockReset().mockImplementation(async row => pending(row.jobId)); f.resume.mockReset().mockImplementationOnce(async row => ({ ...pending(row.jobId), state: 'retry_required' })).mockImplementation(async row => complete(row.jobId));
  f.purge.mockReset().mockImplementation(async owner => { expect(f.writers.has(owner.accountId)).toBe(false); markDeletedAccount(owner.backendId, owner.accountId); return { legacyPreserved: true }; });
  f.clearSession.mockReset().mockImplementation(account => removeDeletedAccountSession(scope.backendId, 'sb-deletion-auth-token', account, localStorage, undefined));
  f.signOut.mockReset().mockImplementation(async () => { f.session = null; await f.listener!('SIGNED_OUT', null); return { error: null }; });
});
afterEach(cleanup);
describe('real AuthProvider deletion boundary and auth continuation', () => {
  it('unmounts this account’s writers, keeps recovery reachable after Auth loss, and never runs ordinary global cache clearing', async () => {
    renderApp(); await screen.findByText(`Account ${scope.accountId}`); fireEvent.click(screen.getByText('Confirm deletion'));
    await screen.findByRole('button', { name: 'Continue deletion' }); expect(f.writers.has(scope.accountId)).toBe(false);
    await act(async () => { f.session = null; await f.listener!('SIGNED_OUT', null); }); await screen.findByText('Sign in form');
    expect(screen.getByRole('button', { name: 'Continue deletion' })).toBeTruthy(); expect(f.clear).not.toHaveBeenCalled(); expect(f.removeItem).not.toHaveBeenCalled();
    await waitFor(() => expect((screen.getByRole('button', { name: 'Continue deletion' }) as HTMLButtonElement).disabled).toBe(false)); fireEvent.click(screen.getByRole('button', { name: 'Continue deletion' })); await screen.findByText(/Some older device caches/);
    expect(f.purge).toHaveBeenCalledOnce(); expect(f.clearSession).toHaveBeenCalledWith(scope.accountId); expect(localStorage.getItem('sb-deletion-auth-token')).toBeNull(); expect([...f.rows.values()][0].recoveryToken).toBeNull(); expect(f.clear).not.toHaveBeenCalled();
  });
  it('finishes a confirmed deletion with account-local sign-out and a truthful completion notice', async () => {
    renderApp(); await screen.findByText(`Account ${scope.accountId}`); fireEvent.click(screen.getByText('Confirm deletion')); await screen.findByRole('button', { name: 'Continue deletion' });
    await waitFor(() => expect((screen.getByRole('button', { name: 'Continue deletion' }) as HTMLButtonElement).disabled).toBe(false)); fireEvent.click(screen.getByRole('button', { name: 'Continue deletion' })); await screen.findByText(/Some older device caches/);
    expect(f.clearSession).toHaveBeenCalledWith(scope.accountId); expect(f.signOut).not.toHaveBeenCalled(); expect(f.clear).not.toHaveBeenCalled(); expect(f.removeItem).not.toHaveBeenCalled(); expect(screen.getByText('Sign in form')).toBeTruthy();
  });
  it('does not unmount, clear or sign out account B when a late deletion for account A completes', async () => {
    const wait = deferred<DeletionStatus>(); f.start.mockReturnValue(wait.promise); renderApp(); await screen.findByText(`Account ${scope.accountId}`);
    fireEvent.click(screen.getByText('Confirm deletion')); await waitFor(() => expect(f.start).toHaveBeenCalledOnce()); const row = f.start.mock.calls[0][0];
    await act(async () => { f.session = { user: { id: id(90) } }; localStorage.setItem('sb-deletion-auth-token', JSON.stringify(f.session)); await f.listener!('SIGNED_IN', f.session); }); await screen.findByText(`Account ${id(90)}`);
    await act(async () => { wait.resolve(complete(row.jobId)); }); await waitFor(() => expect([...f.rows.values()][0].cleanupComplete).toBe(true));
    expect(f.writers.has(id(90))).toBe(true); expect(f.signOut).not.toHaveBeenCalled(); expect(f.clearSession).toHaveBeenCalledWith(scope.accountId); expect(localStorage.getItem('sb-deletion-auth-token')).toContain(id(90)); expect(f.clear).not.toHaveBeenCalled(); expect(screen.queryByRole('region', { name: 'Account deletion' })).toBeNull();
  });
  it('restores the saved deletion guard before mounting account data after provider reload', async () => {
    const first = renderApp(); await screen.findByText(`Account ${scope.accountId}`); fireEvent.click(screen.getByText('Confirm deletion')); await screen.findByRole('button', { name: 'Continue deletion' }); first.unmount();
    renderApp(); await screen.findByRole('button', { name: 'Continue deletion' }); expect(f.writers.has(scope.accountId)).toBe(false); expect(f.start).toHaveBeenCalledOnce();
  });
});
