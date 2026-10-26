import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readAccountingEnabled, readRewardActionData, rewardActionKey, rewardInventory } from '@/data/rewards/actionReadModel';

const mocks = vi.hoisted(() => ({ account: 'a', rows: {} as Record<string, any[]>, requests: [] as any[], afterRead: null as (() => void) | null }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'http://127.0.0.1:28622', supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: mocks.account }, access_token: `token-${mocks.account}` } }, error: null }) },
  from: (table: string) => {
    const record: any = { table, headers: {}, filters: {}, start: 0, end: 499 };
    const q: any = { select: (fields: string) => { record.fields = fields; return q; }, eq: (field: string, value: string) => { record.filters[field] = value; return q; },
      order: () => q, range: (start: number, end: number) => { record.start = start; record.end = end; return q; },
      maybeSingle: () => { record.single = true; return q; }, setHeader: (name: string, value: string) => { record.headers[name] = value; return q; }, abortSignal: () => q,
      then: (resolve: (value: any) => void) => { mocks.requests.push(record); const rows = mocks.rows[table] ?? []; mocks.afterRead?.(); return Promise.resolve(resolve({ data: record.single ? rows[0] ?? null : rows.slice(record.start, record.end + 1), error: null })); },
    }; return q;
  },
} }));
const scope = { backendId: 'http://127.0.0.1:28622', accountId: 'a', participantId: 'participant', relationshipId: 'period' };
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
});
