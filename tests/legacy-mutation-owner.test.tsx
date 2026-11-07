import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readCacheFactory } from './read-cache-fake';
const f = vi.hoisted(() => ({ getUser: vi.fn(), partner: vi.fn(), send: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn(),
  client: { setQueryData: vi.fn(), invalidateQueries: vi.fn() } }));
// Execute the real hook callbacks with controlled async boundaries; no backend calls.
vi.mock('@tanstack/react-query', () => ({ useMutation: (options: unknown) => options, useQueryClient: () => f.client }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: f.getUser } } }));
vi.mock('@/contexts/UserIdsContext', () => ({ useUserIds: () => ({ subUserId: 'A', domUserId: 'D' }) }));
vi.mock('@/hooks/usePartnerHelper', () => ({ usePartnerHelper: () => ({ getPartnerId: f.partner }) }));
vi.mock('@/hooks/usePushNotifications', () => ({ usePushNotifications: () => ({ sendTaskCompletedNotification: f.send, sendRewardPurchasedNotification: f.send, sendRewardRedeemedNotification: f.send, sendPunishmentPerformedNotification: f.send, sendRuleBrokenNotification: f.send }) }));
vi.mock('@/lib/taskUtils', () => ({ getCurrentDayOfWeek: () => 0 }));
vi.mock('@/lib/toastManager', () => ({ toastManager: { success: f.success, error: f.error, warn: f.warn } }));
vi.mock('@/hooks/use-toast', () => ({ toast: f.error }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/data/tasks/queries', () => ({ TASKS_QUERY_KEY: ['tasks'] }));
vi.mock('@/data/rules/queries', () => ({ RULES_QUERY_KEY: ['rules'] }));
vi.mock('@/data/rewards/queries', () => ({ REWARDS_QUERY_KEY: ['rewards'], REWARDS_POINTS_QUERY_KEY: ['reward-points'] }));
vi.mock('@/data/punishments/queries', () => ({ PUNISHMENT_HISTORY_QUERY_KEY: ['punishment-history'] }));
vi.mock('@/data/points/useUserPointsQuery', () => ({ USER_POINTS_QUERY_KEY_PREFIX: 'userPoints' }));
vi.mock('@/data/points/useUserDomPointsQuery', () => ({ USER_DOM_POINTS_QUERY_KEY_PREFIX: 'userDomPoints' }));
import { captureCacheToken, prepareIdentityCacheScope, type CacheToken } from '@/data/indexedDB/useIndexedDB';
import { useToggleTaskCompletionMutation } from '@/data/tasks/mutations/useToggleTaskCompletionMutation';
import { useBuySubReward } from '@/data/rewards/mutations/useBuySubReward';
import { useRedeemSubReward } from '@/data/rewards/mutations/useRedeemSubReward';
import { useApplyPunishment } from '@/data/punishments/mutations/useApplyPunishment';
import { useCreateRuleViolation } from '@/data/rules/mutations/useCreateRuleViolation';
type Callbacks = { onSuccess: (data: unknown, variables: unknown, context: { cacheToken: CacheToken | null }) => Promise<void> };
const callbacks = (hook: () => unknown) => hook() as Callbacks;
const scope = { backendId: 'https://callback.invalid', accountId: 'A', relationshipId: 'period', relationshipSessionId: 'one' };
const vars = { completed: true, task: { title: 'Private A task' }, pointsValue: 4, rewardId: 'reward', ruleName: 'Private A rule' };
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
const change = () => prepareIdentityCacheScope({ ...scope, accountId: 'B', relationshipSessionId: 'two' }, ['B']);
beforeEach(async () => { vi.clearAllMocks(); localStorage.clear(); vi.stubGlobal('indexedDB', readCacheFactory().factory); await prepareIdentityCacheScope(scope, ['A', 'D']); f.getUser.mockResolvedValue({ data: { user: { id: 'A' } } }); f.partner.mockResolvedValue('D'); f.send.mockResolvedValue(false); });
describe('originating identity after legacy callback awaits', () => {
  it('stops task notification before partner lookup if identity changed during auth lookup', async () => {
    const auth = deferred<unknown>(); f.getUser.mockReturnValue(auth.promise);
    const pending = callbacks(useToggleTaskCompletionMutation).onSuccess(undefined, vars, { cacheToken: captureCacheToken() });
    await change(); auth.resolve({ data: { user: { id: 'B' } } }); await pending;
    expect(f.partner).not.toHaveBeenCalled(); expect(f.send).not.toHaveBeenCalled(); expect(f.warn).not.toHaveBeenCalled();
  });
  it.each([useToggleTaskCompletionMutation, useBuySubReward, useRedeemSubReward, useApplyPunishment, useCreateRuleViolation])('does not use a late partner response from %s', async hook => {
    const partner = deferred<string>(); f.partner.mockReturnValue(partner.promise);
    const pending = callbacks(hook).onSuccess({ id: 'saved' }, vars, { cacheToken: captureCacheToken() });
    await Promise.resolve(); expect(f.partner).toHaveBeenCalledOnce();
    f.client.invalidateQueries.mockClear(); f.success.mockClear();
    await change(); partner.resolve('D'); await pending;
    expect(f.send).not.toHaveBeenCalled(); expect(f.warn).not.toHaveBeenCalled(); expect(f.error).not.toHaveBeenCalled();
    expect(f.client.invalidateQueries).not.toHaveBeenCalled(); expect(f.success).not.toHaveBeenCalled();
  });
  it('suppresses task warning after a notification result arrives in a replacement account', async () => {
    const send = deferred<boolean>(); f.send.mockReturnValue(send.promise);
    const pending = callbacks(useToggleTaskCompletionMutation).onSuccess(undefined, vars, { cacheToken: captureCacheToken() });
    await Promise.resolve(); await Promise.resolve(); expect(f.send).toHaveBeenCalledOnce();
    await change(); send.resolve(false); await pending;
    expect(f.warn).not.toHaveBeenCalled(); expect(f.error).not.toHaveBeenCalled();
  });
});
