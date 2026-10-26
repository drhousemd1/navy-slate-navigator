import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWeeklyMetrics } from '@/data/queries/metrics/useWeeklyMetrics';
import { useMonthlyMetrics } from '@/data/queries/metrics/useMonthlyMetrics';
import { useWeeklyMetricsSummary } from '@/data/queries/useWeeklyMetricsSummary';
import { useWeeklyWellbeingQuery } from '@/data/wellbeing/queries/useWeeklyWellbeingQuery';
import { useMonthlyWellbeingQuery } from '@/data/wellbeing/queries/useMonthlyWellbeingQuery';
import { useCreateRewardMutation } from '@/data/rewards/mutations/useCreateReward';
import { useCreatePunishment } from '@/data/punishments/mutations/useCreatePunishment';

const mocks = vi.hoisted(() => ({ identity: {} as Record<string, unknown>, filters: [] as string[][],
  error: null as null | Error, data: {} as Record<string, unknown[]>, inserts: [] as Record<string, unknown>[],
  from: vi.fn(), query: vi.fn(), mutation: vi.fn() }));
vi.mock('@/contexts/UserIdsContext', () => ({ useUserIds: () => mocks.identity }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: unknown) => { mocks.query(options); return options; }, useQueryClient: () => ({}) }));
vi.mock('@/lib/optimistic-mutations', () => ({ useCreateOptimisticMutation: (options: unknown) => { mocks.mutation(options); return options; } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/data/indexedDB/useIndexedDB', () => ({ saveRewardsToDB: vi.fn(), savePunishmentsToDB: vi.fn() }));
vi.mock('@/data/rewards/queries', () => ({ getRewardsQueryKey: (sub: string, dom: string) => ['rewards', sub, dom] }));
vi.mock('@/data/punishments/queries', () => ({ PUNISHMENTS_QUERY_KEY: ['punishments'] }));
vi.mock('@/utils/image/rewardIntegration', () => ({ processImageForSave: async () => ({ processedUrl: null, metadata: null }) }));
vi.mock('@/utils/image/punishmentIntegration', () => ({ processImageForSave: async () => ({ processedUrl: null, metadata: null }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), debug: vi.fn() } }));

beforeEach(() => {
  mocks.identity = { status: 'unlinked', currentUserId: 'D', currentRole: 'dom', subUserId: null, domUserId: 'D', canAccessData: true, isLoadingUserIds: false };
  mocks.filters = []; mocks.error = null; mocks.data = {}; mocks.inserts = [];
  mocks.from.mockImplementation((table: string) => {
    const chain = {
      select: () => chain, gte: () => chain, lte: () => chain, order: () => chain,
      in: (_field: string, ids: string[]) => { mocks.filters.push(ids); return chain; },
      insert: (value: Record<string, unknown>) => { mocks.inserts.push(value); return chain; },
      single: async () => ({ data: { id: 'saved', ...mocks.inserts.at(-1) }, error: mocks.error }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: mocks.data[table] ?? [], error: mocks.error }).then(resolve),
    };
    return chain;
  });
});
const readers = [useWeeklyMetrics, useMonthlyMetrics, useWeeklyMetricsSummary, useWeeklyWellbeingQuery, useMonthlyWellbeingQuery];
function queryOptions(reader: () => unknown) {
  reader();
  return mocks.query.mock.calls.at(-1)![0] as { enabled: boolean; queryFn: () => Promise<unknown> };
}

describe('all five previously both-ID-required readers', () => {
  it.each(readers)('%s reads solo Dom records and propagates a backend failure', async reader => {
    const options = queryOptions(reader);
    expect(options.enabled).toBe(true);
    await options.queryFn();
    expect(mocks.filters.length).toBeGreaterThan(0);
    expect(mocks.filters.every(ids => JSON.stringify(ids) === '["D"]')).toBe(true);
    mocks.error = new Error('read denied');
    await expect(options.queryFn()).rejects.toThrow('read denied');
  });
  it.each(readers)('%s retains the paired shared catalog and does not start for missing identity', async reader => {
    mocks.identity = { ...mocks.identity, status: 'linked', subUserId: 'S', domUserId: 'D' };
    await queryOptions(reader).queryFn();
    expect(mocks.filters.every(ids => JSON.stringify(ids) === '["S","D"]')).toBe(true);
    mocks.identity = { subUserId: null, domUserId: null, isLoadingUserIds: false, status: 'error' };
    expect(queryOptions(reader).enabled).toBe(false);
  });
  it.each([useWeeklyWellbeingQuery, useMonthlyWellbeingQuery])('%s preserves the actual role series without fabricating an absent partner score', async reader => {
    mocks.data.wellbeing_snapshots = [{ user_id: 'D', overall_score: 73, updated_at: new Date().toISOString() }];
    const rows = await queryOptions(reader).queryFn() as { domScore: number | null; subScore: number | null; domHasData: boolean }[];
    expect(rows.some(row => row.domScore === 73 && row.domHasData)).toBe(true);
    expect(rows.every(row => row.subScore === null)).toBe(true);
  });
});

describe('solo definition creation', () => {
  it.each([useCreateRewardMutation, useCreatePunishment])('%s saves solo Dom definitions to their own account but preserves linked Sub ownership', async hook => {
    hook();
    const options = () => mocks.mutation.mock.calls.at(-1)![0] as { mutationFn: (value: unknown) => Promise<unknown> };
    await options().mutationFn({ title: 'Example', points: 5, cost: 5 });
    expect(mocks.inserts.at(-1)?.user_id).toBe('D');
    mocks.identity = { ...mocks.identity, status: 'linked', subUserId: 'S' };
    hook();
    await options().mutationFn({ title: 'Example', points: 5, cost: 5 });
    expect(mocks.inserts.at(-1)?.user_id).toBe('S');
    mocks.identity = { ...mocks.identity, canAccessData: false };
    hook();
    await expect(options().mutationFn({ title: 'Example' })).rejects.toThrow();
    expect(mocks.inserts).toHaveLength(2);
  });
});
