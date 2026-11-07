import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { usePartnerLinking } from '@/contexts/auth/usePartnerLinking';
import { UserIdsProvider } from '@/contexts/UserIdsContext';
import { emptyIdentity } from '@/lib/identity';
import { projectRecoverySnapshot, readRecoverySnapshot, saveRecoverySnapshot, setRecoveryAccess, verifyRecoveryScope } from '@/lib/offline/recovery';
import type { RewardActionData } from '@/data/rewards/actionReadModel';
import { command, scope, uuid } from './action-queue.helpers';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), auth: {} as Record<string, unknown>, list: vi.fn(), close: vi.fn(), signOut: vi.fn() }));
vi.mock('@/data/identity', () => ({ fetchIdentity: mocks.fetch, callIdentityCommand: vi.fn(), fetchLinkPreview: vi.fn(), identityCommandError: (error: Error) => error.message }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'http://127.0.0.1:28622' }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/data/indexedDB/useIndexedDB', () => ({ prepareIdentityCacheScope: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/data/actions/store', () => ({ IndexedDBActionQueueStore: class { list = mocks.list; close = mocks.close; } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/toastManager', () => ({ toastManager: { success: vi.fn(), error: vi.fn() } }));
const ready = (account = scope.accountId, period = scope.relationshipId) => ({ ...emptyIdentity('linked', account), canAccessData: true,
  currentRole: 'sub' as const, subUserId: account, domUserId: uuid(8), partnerUserId: uuid(8), participantId: scope.participantId,
  relationshipId: period, relationshipSessionId: scope.relationshipSessionId, relationshipStatus: 'active', timezone: 'America/Boise' });
function Harness({ account = scope.accountId }) {
  const linking = usePartnerLinking(account ? { id: account } as User : null);
  mocks.auth = { user: account ? { id: account } : null, loading: false, relationshipIdentity: linking.relationshipIdentity,
    refreshIdentity: linking.refreshIdentity, signOut: mocks.signOut, updateUserRole: vi.fn(), unlinkFromPartner: vi.fn() };
  return <UserIdsProvider><p>Live product controls</p></UserIdsProvider>;
}
const view = (account = scope.accountId) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const tree = (id: string) => <QueryClientProvider client={client}><MemoryRouter><Harness account={id} /></MemoryRouter></QueryClientProvider>;
  const result = render(tree(account));
  return { ...result, change: (id: string) => result.rerender(tree(id)) };
};
beforeEach(() => {
  localStorage.clear(); vi.resetAllMocks();
  setRecoveryAccess(scope.backendId, scope.accountId, 'checking');
  mocks.close.mockResolvedValue(undefined); mocks.signOut.mockResolvedValue(undefined);
  mocks.list.mockResolvedValue([{ sequence: 1, scope, command, state: { status: 'confirmation_unknown' }, createdAt: 1 },
    { sequence: 2, scope: { ...scope, accountId: uuid(90) }, command: { ...command, kind: 'punishment_apply' }, state: { status: 'pending' }, createdAt: 2 }]);
  verifyRecoveryScope(scope);
  saveRecoverySnapshot(projectRecoverySnapshot(scope, { wallets: [{ participant_id: scope.participantId, relationship_id: scope.relationshipId, currency: 'sub', balance: 105 }], lots: [] } as unknown as RewardActionData, Date.now()));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('real identity boundary recovery path (mocked network and store)', () => {
  it('shows a frozen own summary and original pending store after server failure while browser stays online, without live controls or success', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    mocks.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    view();
    await screen.findByRole('heading', { name: 'Connection unavailable' });
    expect(screen.queryByText('Live product controls')).toBeNull();
    expect(screen.getByText('105')).toBeTruthy();
    await screen.findByText(/Confirmation unknown; it may already be recorded/);
    expect(screen.queryByText('Apply punishment')).toBeNull();
    expect(screen.queryByRole('button', { name: /Retry same action|Cancel unsent/ })).toBeNull();
    expect(screen.queryByText(/Success|synced/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Retry connection' })).toBeTruthy();
  });
  it('reverifies before returning to the product and clears a changed period summary', async () => {
    mocks.fetch.mockRejectedValueOnce(new TypeError('Load failed')).mockResolvedValue(ready(scope.accountId, uuid(22)));
    view(); await screen.findByRole('heading', { name: 'Connection unavailable' });
    fireEvent.click(screen.getByRole('button', { name: 'Retry connection' }));
    await screen.findByText('Live product controls');
    expect(screen.queryByText('105')).toBeNull();
    expect(readRecoverySnapshot(scope.backendId, scope.accountId)).toBeNull();
  });
  it('never exposes recovery for explicit auth or permission denial, even if navigator is offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    mocks.fetch.mockRejectedValue(new Error('403 permission denied'));
    view(); await screen.findByRole('heading', { name: 'Account connection needs attention' });
    expect(screen.queryByText('105')).toBeNull(); expect(mocks.list).not.toHaveBeenCalled();
    expect(readRecoverySnapshot(scope.backendId, scope.accountId)).toBeNull();
  });
  it('hides the previous account immediately without adopting or erasing its snapshot', async () => {
    mocks.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const rendered = view(); await screen.findByText('105');
    rendered.change(uuid(91)); expect(screen.queryByText('105')).toBeNull();
    await screen.findByText(/No confirmed totals/);
    expect(readRecoverySnapshot(scope.backendId, uuid(91))).toBeNull();
    expect(readRecoverySnapshot(scope.backendId, scope.accountId)?.wallets[0].balance).toBe(105);
  });
  it('removes the summary before signout and does not delete saved commands', async () => {
    mocks.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    view(); await screen.findByText('105');
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    expect(readRecoverySnapshot(scope.backendId, scope.accountId)).toBeNull();
    expect(mocks.list).toHaveBeenCalled(); // This adapter exposes no mutation method.
  });
  it('offers recovery after a bounded stalled identity request and periodically retries without relying on an online event', async () => {
    vi.useFakeTimers(); mocks.fetch.mockReturnValueOnce(new Promise(() => {})).mockResolvedValue(ready());
    view();
    await act(async () => { await vi.advanceTimersByTimeAsync(12_001); });
    expect(screen.getByRole('heading', { name: 'Connection unavailable' })).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(15_001); });
    expect(screen.getByText('Live product controls')).toBeTruthy();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it('reports unreadable saved actions without claiming none exist or offering destructive clearing', async () => {
    mocks.fetch.mockRejectedValue(new TypeError('Failed to fetch')); mocks.list.mockRejectedValue(new Error('Storage denied'));
    view(); await screen.findByText(/Saved actions could not be read/);
    expect(screen.queryByText(/No unconfirmed actions were found/)).toBeNull();
  });
});
