import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionCommandsProvider, useActionCommands } from '@/contexts/ActionCommandsContext';
import { uuid, receipt } from './action-queue.helpers';

const mocks = vi.hoisted(() => ({ identity: null as any, gate: vi.fn(), read: vi.fn(), send: vi.fn(), online: true }));
vi.mock('@/contexts/UserIdsContext', () => ({ useUserIds: () => mocks.identity }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.identity?.currentUserId ? { id: mocks.identity.currentUserId } : null }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, supabaseBackendId: 'http://127.0.0.1:28622' }));
vi.mock('@/components/rewards/RewardFeedback', () => ({ RewardFeedback: () => null }));
vi.mock('@/data/rewards/actionReadModel', async importOriginal => ({ ...await importOriginal<any>(),
  readAccountingEnabled: (...args: any[]) => mocks.gate(...args), readRewardActionData: (...args: any[]) => mocks.read(...args) }));
vi.mock('@/data/actions/supabase-transport', () => ({ createSupabaseRewardTransport: () => ({ backendId: 'http://127.0.0.1:28622', execute: (...args: any[]) => mocks.send(...args) }) }));
vi.mock('@/data/actions/store', async () => {
  const { MemoryQueueStore } = await import('./action-queue.helpers');
  return { IndexedDBActionQueueStore: class extends MemoryQueueStore { async close() {} } };
});
beforeEach(() => {
  mocks.identity = { canAccessData: true, isLoadingUserIds: false, currentUserId: uuid(1), participantId: uuid(2), relationshipId: uuid(3), relationshipStatus: 'active' };
  mocks.gate.mockReset().mockResolvedValue(true);
  mocks.read.mockReset().mockResolvedValue({ rewards: [], wallets: [], lots: [], events: [], points: [], deliveries: [], acknowledged: [] });
  mocks.send.mockReset(); mocks.online = true;
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => mocks.online);
});
afterEach(cleanup);
const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}><ActionCommandsProvider>{children}</ActionCommandsProvider></QueryClientProvider>;
};
describe('mounted command provider scope and offline gate', () => {
  it('refetches current balances after confirmation instead of applying the historical receipt balance', async () => {
    const state = { rewards: [], lots: [], events: [], points: [], deliveries: [], acknowledged: [], wallets: [{ currency: 'sub', balance: 100 }] };
    mocks.read.mockResolvedValueOnce(state).mockResolvedValue({ ...state, wallets: [{ currency: 'sub', balance: 99 }] });
    mocks.send.mockImplementation(async command => ({ kind: 'confirmed', receipt: receipt(command) }));
    const { result } = renderHook(useActionCommands, { wrapper: setup() });
    await waitFor(() => expect(result.current.data?.wallets[0]?.balance).toBe(100));
    await act(async () => { await result.current.enqueue({ kind: 'reward_buy', rewardId: uuid(5), expectedCost: 7 }); });
    await waitFor(() => expect(result.current.entries[0]?.state.status).toBe('confirmed'));
    await waitFor(() => expect(result.current.data?.wallets[0]?.balance).toBe(99));
    expect(result.current.confirmed[0].state.status === 'confirmed' && result.current.confirmed[0].state.receipt.balances[0].balance).toBe(17);
  });
  it('keeps a verified same-period atomic gate through offline refresh failure and durably saves intent', async () => {
    const { result } = renderHook(useActionCommands, { wrapper: setup() });
    await waitFor(() => expect(result.current.mode).toBe('atomic'));
    mocks.online = false; mocks.gate.mockRejectedValue(new Error('Offline: last verified accounting status retained.'));
    await act(async () => { window.dispatchEvent(new Event('offline')); await result.current.refresh(); });
    await waitFor(() => expect(result.current.error).toContain('Offline'));
    expect(result.current.mode).toBe('atomic');
    await act(async () => { await result.current.enqueue({ kind: 'reward_buy', rewardId: uuid(5), expectedCost: 7 }); });
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    expect(result.current.entries[0].state.status).toBe('pending');
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('fails closed when this account/period has never verified its accounting status', async () => {
    mocks.gate.mockRejectedValue(new Error('Status unavailable'));
    const { result } = renderHook(useActionCommands, { wrapper: setup() });
    await waitFor(() => expect(result.current.mode).toBe('error'));
    await expect(result.current.enqueue({ kind: 'reward_buy', rewardId: uuid(5), expectedCost: 7 })).rejects.toThrow('Load your current reward account');
    expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
  it('hides another account immediately and does not reuse a previous period’s verified gate', async () => {
    mocks.online = false;
    const { result, rerender } = renderHook(useActionCommands, { wrapper: setup() });
    await waitFor(() => expect(result.current.mode).toBe('atomic'));
    await act(async () => { await result.current.enqueue({ kind: 'reward_buy', rewardId: uuid(5), expectedCost: 7 }); });
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    mocks.gate.mockRejectedValue(new Error('Status unavailable'));
    mocks.identity = { ...mocks.identity, currentUserId: uuid(10), participantId: uuid(11), relationshipId: uuid(12) };
    rerender();
    expect(result.current.entries).toHaveLength(0);
    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.mode).toBe('error'));
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
