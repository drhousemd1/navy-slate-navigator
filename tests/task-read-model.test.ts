import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeTaskProgress, readTaskActionData, removeTaskDefinition, saveTaskDefinition, taskActionKey, taskDefinitionPayload } from '@/data/tasks/actionReadModel';
const mocks = vi.hoisted(() => ({ account: 'account', rows: {} as Record<string, any[]>, requests: [] as any[], rpc: {} as Record<string, any>, after: null as (() => void) | null }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'http://127.0.0.1:28622', supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: mocks.account }, access_token: `token-${mocks.account}` } }, error: null }) },
  rpc: (name: string, args: any) => builder({ name, args, rpc: true }), from: (table: string) => builder({ table }),
} }));
function builder(initial: any) {
  const record = { ...initial, headers: {}, filters: {}, start: 0, end: 499 };
  const q: any = {
    select: (fields: string) => { record.fields = fields; return q; }, eq: (name: string, value: any) => { record.filters[name] = value; return q; }, is: (name: string, value: any) => { record.filters[name] = value; return q; },
    update: (payload: any) => { record.update = payload; return q; }, insert: (payload: any) => { record.insert = payload; return q; }, single: () => { record.single = true; return q; },
    range: (start: number, end: number) => { record.start = start; record.end = end; return q; }, order: () => q,
    setHeader: (name: string, value: string) => { record.headers[name] = value; return q; }, abortSignal: () => q,
    then: (resolve: (value: any) => void) => { mocks.requests.push(record); mocks.after?.();
      const result = record.rpc ? mocks.rpc[record.args.p_task_id ?? 'all'] : { data: record.single ? { id: record.filters.id ?? id(1), relationship_id: 'period' } : (mocks.rows[record.table] ?? []).slice(record.start, record.end + 1), error: null };
      return Promise.resolve(resolve(result)); },
  }; return q;
}
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const scope = { backendId: 'http://127.0.0.1:28622', accountId: 'account', participantId: id(3), relationshipId: 'period' };
const progress = { taskId: id(1), beneficiaryParticipantId: id(3), currency: 'sub', timeZone: 'Pacific/Honolulu', localDate: '2026-10-25', weekStartDate: '2026-10-19', weekIdentifier: '2026-W43', frequency: 'weekly', target: 2, currentCount: 1, usageData: [1,0,0,0,0,0,0], completed: false, lastCompletedDate: '2026-10-19', deleted: false };
const form = { title: 'Task', frequency: 'daily', frequency_count: 2, points: 0, icon_url: undefined, background_image_url: undefined } as any;
beforeEach(() => { mocks.account = 'account'; mocks.requests = []; mocks.rows = { tasks: [{ id: id(1), relationship_id: 'period', deleted_at: null }] }; mocks.rpc = { all: { data: [progress], error: null } }; mocks.after = null; });
describe('task reads and definition boundary', () => {
  it('pins the current account token and expected period; keeps imported rows without Auth IDs or private intent', async () => {
    mocks.rows.task_completion_history = [{ id: id(10), relationship_id: 'period', task_id: id(1), completed_at: '2025-04-01T12:00:00+00:00', action_event_id: null }, { id: id(11), relationship_id: 'period', action_event_id: id(12) }];
    const data = await readTaskActionData(scope); expect(data.imported).toHaveLength(1); expect(data.progress[id(1)].currentCount).toBe(1);
    expect(mocks.requests.every(row => row.headers.Authorization === 'Bearer token-account')).toBe(true);
    expect(mocks.requests.filter(row => !row.rpc).every(row => row.filters.relationship_id === 'period' && !/user_id|source_snapshot|intent|\*/.test(row.fields))).toBe(true);
    expect(mocks.requests.find(row => row.rpc).args).toEqual({ p_expected_relationship_id: 'period', p_task_id: null });
  });
  it('rejects a different account before requests and after a late account change', async () => {
    mocks.account = 'other'; await expect(readTaskActionData(scope)).rejects.toThrow('account changed'); expect(mocks.requests).toHaveLength(0);
    mocks.account = 'account'; mocks.after = () => { mocks.account = 'other'; }; await expect(readTaskActionData(scope)).rejects.toThrow('account changed');
  });
  it('isolates one repairable task while retaining other progress and history', async () => {
    mocks.rows.tasks.push({ id: id(2), relationship_id: 'period', deleted_at: null });
    mocks.rpc = { all: { data: null, error: { message: 'TASK_OWNER_MISSING' } }, [id(1)]: { data: progress, error: null }, [id(2)]: { data: null, error: { message: 'TASK_OWNER_MISSING' } } };
    const data = await readTaskActionData(scope); expect(data.tasks).toHaveLength(2); expect(data.progress[id(1)]).toBeTruthy(); expect(data.progressErrors[id(2)]).toContain('selected role');
  });
  it('fails closed on network errors, cross-period rows, or incomplete progress', async () => {
    mocks.rpc.all = { error: { message: 'Network unavailable' } }; await expect(readTaskActionData(scope)).rejects.toThrow('could not be loaded');
    expect(mocks.requests.filter(row => row.rpc)).toHaveLength(1);
    mocks.rpc.all = { data: [progress] }; mocks.rows.tasks[0].relationship_id = 'old'; await expect(readTaskActionData(scope)).rejects.toThrow('different relationship');
    mocks.rows.tasks[0].relationship_id = 'period'; mocks.rpc.all = { data: [] }; await expect(readTaskActionData(scope)).rejects.toThrow('incomplete');
  });
  it('rejects inconsistent counters and isolates account/period caches', () => {
    expect(() => decodeTaskProgress({ ...progress, currentCount: 0 })).toThrow('counters');
    expect(() => decodeTaskProgress({ ...progress, localDate: '2026-10-26' })).toThrow('calendar');
    expect(taskActionKey(scope)).not.toEqual(taskActionKey({ ...scope, accountId: 'other' })); expect(taskActionKey(scope)).not.toEqual(taskActionKey({ ...scope, relationshipId: 'other' }));
  });
  it('saves only definition fields, explicitly clears images and preserves zero points', async () => {
    const payload = taskDefinitionPayload({ ...form, completed: true, usage_data: [9,9,9,9,9,9,9], user_id: 'forged', relationship_id: 'forged', deleted_at: 'forged' });
    expect(payload).toEqual({ title: 'Task', frequency: 'daily', frequency_count: 2, points: 0, icon_url: null, background_image_url: null });
    await saveTaskDefinition(scope, form, id(1));
    expect(mocks.requests[0]).toMatchObject({ update: payload, filters: { id: id(1), relationship_id: 'period', deleted_at: null }, headers: { Authorization: 'Bearer token-account' } });
  });
  it('soft-deletes the reviewed current task without deleting history or mutating points', async () => {
    await removeTaskDefinition(scope, id(1));
    expect(mocks.requests).toHaveLength(1); expect(Object.keys(mocks.requests[0].update)).toEqual(['deleted_at']);
    expect(mocks.requests[0]).toMatchObject({ table: 'tasks', filters: { id: id(1), relationship_id: 'period', deleted_at: null } });
  });
});
