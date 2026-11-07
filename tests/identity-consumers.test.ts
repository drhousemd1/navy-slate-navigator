import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWeeklyWellbeingQuery } from '@/data/wellbeing/queries/useWeeklyWellbeingQuery';
import { useMonthlyWellbeingQuery } from '@/data/wellbeing/queries/useMonthlyWellbeingQuery';
import type { WellbeingMetrics } from '@/data/wellbeing/types';
import { useCreateRewardMutation } from '@/data/rewards/mutations/useCreateReward';
import { useCreatePunishment } from '@/data/punishments/mutations/useCreatePunishment';

const mocks = vi.hoisted(() => ({ identity: {} as Record<string, unknown>, reads: [] as { name: string; args: Record<string, unknown> }[],
  error: null as null | Error, data: {} as Record<string, unknown[]>, inserts: [] as Record<string, unknown>[],
  from: vi.fn(), rpc: vi.fn(), query: vi.fn(), mutation: vi.fn() }));
vi.mock('@/contexts/UserIdsContext', () => ({ useUserIds: () => mocks.identity }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: unknown) => { mocks.query(options); return options; }, useQueryClient: () => ({}) }));
vi.mock('@/lib/optimistic-mutations', () => ({ useCreateOptimisticMutation: (options: unknown) => { mocks.mutation(options); return options; } }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://identity-consumers.invalid', supabase: {
  from: mocks.from, rpc: mocks.rpc,
  auth: { getSession: async () => ({ data: { session: { user: { id: mocks.identity.currentUserId }, access_token: 'synthetic-token' } }, error: null }) },
} }));
vi.mock('@/data/indexedDB/useIndexedDB', () => ({ saveRewardsToDB: vi.fn(), savePunishmentsToDB: vi.fn() }));
vi.mock('@/data/rewards/queries', () => ({ getRewardsQueryKey: (sub: string, dom: string) => ['rewards', sub, dom] }));
vi.mock('@/data/punishments/queries', () => ({ PUNISHMENTS_QUERY_KEY: ['punishments'] }));
vi.mock('@/utils/image/rewardIntegration', () => ({ processImageForSave: async () => ({ processedUrl: null, metadata: null }) }));
vi.mock('@/utils/image/punishmentIntegration', () => ({ processImageForSave: async () => ({ processedUrl: null, metadata: null }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), debug: vi.fn() } }));

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-27T12:00:00Z'));
  mocks.identity = { status: 'unlinked', currentUserId: 'D', currentRole: 'dom', subUserId: null, domUserId: 'D',
    relationshipId: 'period', relationshipSessionId: 'session', timezone: 'UTC', canAccessData: true, isLoadingUserIds: false };
  mocks.reads = []; mocks.error = null; mocks.data = {}; mocks.inserts = [];
  mocks.query.mockClear(); mocks.mutation.mockClear(); mocks.rpc.mockReset(); mocks.from.mockClear();
  mocks.rpc.mockImplementation((name: string, args: Record<string, unknown>) => {
    mocks.reads.push({ name, args });
    const chain = {
      setHeader: () => chain, abortSignal: () => chain,
      then: (resolve: (value: unknown) => unknown) => {
        const people = [{ userId: 'D', role: 'dom', timezone: 'UTC', latest: null }];
        if (mocks.identity.status === 'linked') people.unshift({ userId: 'S', role: 'sub', timezone: 'UTC', latest: null });
        const data = name === 'get_wellbeing_status' ? people : mocks.data[String(args.p_subject_user_id)] ?? [];
        return Promise.resolve({ data, error: mocks.error }).then(resolve);
      },
    };
    return chain;
  });
  mocks.from.mockImplementation((table: string) => {
    const chain = {
      select: () => chain, gte: () => chain, lte: () => chain, order: () => chain,
      insert: (value: Record<string, unknown>) => { mocks.inserts.push(value); return chain; },
      single: async () => ({ data: { id: 'saved', ...mocks.inserts.at(-1) }, error: mocks.error }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: mocks.data[table] ?? [], error: mocks.error }).then(resolve),
    };
    return chain;
  });
});
afterEach(() => vi.useRealTimers());
// Wellbeing now resolves visible people and dated records through scoped RPCs.
// Keep testing role ownership and missing-partner behavior through those actual
// readers, rather than recreating the retired raw-table filtering path.
const readers = [useWeeklyWellbeingQuery, useMonthlyWellbeingQuery];
function queryOptions(reader: () => unknown) {
  reader();
  return mocks.query.mock.calls.at(-1)![0] as { enabled: boolean; queryKey: unknown[]; queryFn: (context: { signal: AbortSignal }) => Promise<unknown> };
}
const execute = (options: ReturnType<typeof queryOptions>) => options.queryFn({ signal: new AbortController().signal });
const subjectsRead = () => mocks.reads.filter(read => read.name === 'list_wellbeing_checkins').map(read => read.args.p_subject_user_id);

describe('scoped wellbeing identity consumers', () => {
  it.each(readers)('%s reads solo Dom records and propagates a backend failure', async reader => {
    const options = queryOptions(reader);
    expect(options.enabled).toBe(true);
    await execute(options);
    expect(subjectsRead()).toEqual(['D']);
    expect(mocks.reads.every(read => read.args.p_expected_relationship_id === 'period' && read.args.p_expected_relationship_session_id === 'session')).toBe(true);
    expect(options.queryKey).toContain('https://identity-consumers.invalid');
    expect(options.queryKey).toContain('D'); expect(options.queryKey).toContain('session');
    mocks.error = new Error('read denied');
    await expect(execute(options)).rejects.toThrow('read denied');
  });
  it.each(readers)('%s reads both authorized roles and does not start for missing identity', async reader => {
    mocks.identity = { ...mocks.identity, status: 'linked', subUserId: 'S', domUserId: 'D' };
    await execute(queryOptions(reader));
    expect(subjectsRead()).toEqual(['S', 'D']);
    mocks.identity = { subUserId: null, domUserId: null, isLoadingUserIds: false, status: 'error' };
    expect(queryOptions(reader).enabled).toBe(false);
  });
  it.each([useWeeklyWellbeingQuery, useMonthlyWellbeingQuery])('%s preserves the actual role series without fabricating an absent partner score', async reader => {
    mocks.data.D = [{ id: 'checkin', userId: 'D', participantId: 'dom-participant', relationshipId: 'period', relationshipSessionId: 'session',
      commandId: 'saved-command', metrics: { anxiety: 27, stress: 27, irritability: 27, overwhelm: 27,
        energy: 73, intimacy: 27, physical_touch: 27, emotional_support: 27 } satisfies WellbeingMetrics,
      overallScore: 73, scoreVersion: 'needs-v1', recordedAt: '2026-10-27T12:00:00Z', clientReportedAt: '2026-10-27T12:00:00Z',
      timezone: 'UTC', localDate: '2026-10-27', provenance: 'confirmed_checkin', legacyCreatedAt: null, legacyUpdatedAt: null }];
    const rows = await execute(queryOptions(reader)) as { domScore: number | null; subScore: number | null; domHasData: boolean }[];
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
