import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readAccountingEnabled, readRewardActionData, rewardActionKey, rewardInventory } from '@/data/rewards/actionReadModel';

const mocks = vi.hoisted(() => ({ account: 'a', rows: {} as Record<string, any[]>, requests: [] as any[], afterRead: null as (() => void) | null }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'http://127.0.0.1:28622', supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: mocks.account }, access_token: `token-${mocks.account}` } }, error: null }) },
  rpc: () => identityQuery(),
  from: (table: string) => {
    const record: any = { table, headers: {}, filters: {}, start: 0, end: 499 };
    const q: any = { select: (fields: string) => { record.fields = fields; return q; }, eq: (field: string, value: string) => { record.filters[field] = value; return q; },
      is: (field: string, value: unknown) => { record.filters[field] = value; return q; },
      order: () => q, range: (start: number, end: number) => { record.start = start; record.end = end; return q; },
      maybeSingle: () => { record.single = true; return q; }, setHeader: (name: string, value: string) => { record.headers[name] = value; return q; }, abortSignal: () => q,
      then: (resolve: (value: any) => void) => { mocks.requests.push(record); let rows = mocks.rows[table] ?? [];
        if (record.filters.id) rows = rows.filter(row => row.id === record.filters.id);
        if (record.filters.action_event_id === null) rows = rows.filter(row => row.action_event_id === null);
        mocks.afterRead?.(); return Promise.resolve(resolve({ data: record.single ? rows[0] ?? null : rows.slice(record.start, record.end + 1), error: null })); },
    }; return q;
  },
} }));
function identityQuery() { const q: any = { setHeader: () => q, abortSignal: () => q, then: (resolve: any) => Promise.resolve(resolve({ data: { status: 'ready_solo', relationship_status: 'active', user_id: mocks.account, relationship_id: scope.relationshipId, participant_id: scope.participantId, relationship_session_id: scope.relationshipSessionId }, error: null })) }; return q; }
const scope = { backendId: 'http://127.0.0.1:28622', accountId: 'a', participantId: 'participant', relationshipId: 'period', relationshipSessionId: '00000000-0000-4000-8000-000000000090' };
beforeEach(() => { mocks.account = 'a'; mocks.rows = {}; mocks.requests = []; mocks.afterRead = null; });
describe('reward reads stay in the verified account and period', () => {
  it('uses the narrow accounting columns and explicit request token; absent row is disabled', async () => {
    expect(await readAccountingEnabled(scope)).toBe(false);
    expect(mocks.requests[0]).toMatchObject({ fields: 'relationship_id,accounting_enabled', filters: { relationship_id: 'period' }, headers: { Authorization: 'Bearer token-a' } });
  });
  it('refuses a different signed-in account before any read', async () => {
    mocks.account = 'b';
    await expect(readAccountingEnabled(scope)).rejects.toThrow('account changed');
    expect(mocks.requests).toHaveLength(0);
  });
  it('rejects a late account-switch response instead of exposing its data', async () => {
    mocks.afterRead = () => { mocks.account = 'b'; };
    await expect(readRewardActionData(scope)).rejects.toThrow('account changed');
    expect(mocks.requests.every(row => row.headers.Authorization === 'Bearer token-a')).toBe(true);
  });
  it('pages the complete event history and reads no private account/activation/intent columns', async () => {
    mocks.rows.action_events = Array.from({ length: 501 }, (_, i) => ({ id: String(i), relationship_id: 'period', reward_id: 'reward' }));
    const data = await readRewardActionData(scope);
    expect(data.events).toHaveLength(501);
    expect(mocks.requests.filter(row => row.table === 'action_events')).toHaveLength(2);
    expect(mocks.requests.find(row => row.table === 'action_events').fields).not.toMatch(/actor_user_id|intent|source_snapshot/);
    expect(mocks.requests.find(row => row.table === 'rewards').fields).not.toMatch(/user_id|\*/);
    expect(mocks.requests.every(row => row.filters.relationship_id === 'period')).toBe(true);
  });
  it('rejects a mismatched period or recipient and namespaces caches by account and period', async () => {
    mocks.rows.action_events = [{ id: 'x', relationship_id: 'old-period' }];
    await expect(readRewardActionData(scope)).rejects.toThrow('different relationship');
    mocks.rows = { action_feedback_outbox: [{ relationship_id: 'period', recipient_participant_id: 'other' }] };
    await expect(readRewardActionData(scope)).rejects.toThrow('recipient');
    expect(rewardActionKey(scope)).not.toEqual(rewardActionKey({ ...scope, accountId: 'b' }));
    expect(rewardActionKey(scope)).not.toEqual(rewardActionKey({ ...scope, relationshipId: 'new-period' }));
  });
  it('paginates imported Use records separately from event-backed uses without changing inventory or feedback', async () => {
    mocks.rows.rewards = [{ id: 'deleted', relationship_id: 'period', title: 'Current renamed title', cost: 99, is_dom_reward: true, deleted_at: '2026-01-01' }];
    mocks.rows.reward_usage = Array.from({ length: 501 }, (_, i) => ({ id: String(i), relationship_id: 'period', action_event_id: null, reward_id: i === 0 ? 'deleted' : null,
      created_at: i === 2 ? null : '2025-01-01T00:00:00Z', used: i === 1 ? false : i === 2 ? null : true }));
    mocks.rows.reward_usage.push({ id: 'new-use', relationship_id: 'period', action_event_id: 'new-event', reward_id: 'deleted', created_at: '2026-01-01', used: true });
    mocks.rows.action_wallets = [{ participant_id: 'participant', relationship_id: 'period', currency: 'sub', balance: 10 }];
    mocks.rows.action_feedback_acknowledgments = [{ event_id: 'ack', relationship_id: 'period' }];
    const data = await readRewardActionData(scope);
    expect(data.importedUsage).toHaveLength(501);expect(data.importedUsage.some(row => row.id === 'new-use')).toBe(false);
    expect(data.importedUsage[0]).toEqual({ ...mocks.rows.reward_usage[0], currentTitle: 'Current renamed title' });
    expect(data.importedUsage[1].used).toBe(false);expect(data.importedUsage[2]).toMatchObject({ used: null, created_at: null });
    expect(data.rewards).toEqual([]);expect(data.events).toEqual([]);expect(data.lots).toEqual([]);expect(data.points).toEqual([]);
    expect(data.wallets).toEqual(mocks.rows.action_wallets);expect(data.acknowledged).toEqual(['ack']);
    const requests = mocks.requests.filter(row => row.table === 'reward_usage');expect(requests).toHaveLength(2);
    expect(requests.every(row => row.filters.relationship_id === 'period' && row.filters.action_event_id === null && row.headers.Authorization === 'Bearer token-a')).toBe(true);
    expect(requests[0].fields).toBe('id,relationship_id,reward_id,action_event_id,created_at,used');
  });
  it('rejects foreign-period imported history and late account changes during its read', async () => {
    mocks.rows.reward_usage = [{ id: 'old', relationship_id: 'other-period', action_event_id: null }];
    await expect(readRewardActionData(scope)).rejects.toThrow('different relationship');
    mocks.rows.reward_usage[0].relationship_id = 'period';
    mocks.afterRead = () => { if (mocks.requests.at(-1)?.table === 'reward_usage') mocks.account = 'b'; };
    await expect(readRewardActionData(scope)).rejects.toThrow('account changed');
  });
});
