import { ruleContext, uuid } from './action-queue.helpers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readRecordingData, recordingDefinitionValues, recordingKey, recordingUndoReason, removeRecordingDefinition, saveRecordingDefinition, savedWeekday } from '@/data/recordings/readModel';
const mocks = vi.hoisted(() => ({ account: 'a', rows: {} as Record<string, any[]>, requests: [] as any[], progress: [] as any[], afterRead: null as (() => void) | null }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'http://127.0.0.1:28622', supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: mocks.account }, access_token: `token-${mocks.account}` } }, error: null }) },
  from: (table: string) => query({ table }), rpc: (rpc: string, payload: unknown) => query({ rpc, payload }),
} }));
function query(record: any) {
  record.headers = {}; record.filters = {}; record.start = 0; record.end = 499;
  const q: any = { select: (fields: string) => { record.fields = fields; return q; },
    eq: (field: string, value: string) => { record.filters[field] = value; return q; }, is: (field: string, value: unknown) => { record.filters[field] = value; return q; },
    order: () => q, range: (start: number, end: number) => { record.start = start; record.end = end; return q; },
    insert: (payload: unknown) => { record.method = 'insert'; record.payload = payload; return q; }, update: (payload: unknown) => { record.method = 'update'; record.payload = payload; return q; },
    single: () => { record.single = true; return q; }, setHeader: (name: string, value: string) => { record.headers[name] = value; return q; }, abortSignal: () => q,
    then: (resolve: (value: any) => void) => {
      if (record.rpc === 'get_my_identity') return Promise.resolve(resolve({ data: { status: 'ready_solo', relationship_status: 'active', user_id: mocks.account, relationship_id: scope.relationshipId, participant_id: scope.participantId, relationship_session_id: scope.relationshipSessionId }, error: null }));
      mocks.requests.push(record); let rows = mocks.rows[record.table] ?? [];
      if (record.filters.id && !record.single) rows = rows.filter(row => row.id === record.filters.id);
      mocks.afterRead?.();
      return Promise.resolve(resolve({ data: record.rpc ? mocks.progress : record.single ? rows[0] ?? { id: 'saved', relationship_id: 'period' } : rows.slice(record.start, record.end + 1), error: null }));
    },
  }; return q;
}
const scope = { backendId: 'http://127.0.0.1:28622', accountId: 'a', participantId: 'participant', relationshipId: 'period', relationshipSessionId: '00000000-0000-4000-8000-000000000090' };
beforeEach(() => { mocks.account = 'a'; mocks.rows = {}; mocks.progress = []; mocks.requests = []; mocks.afterRead = null; });
describe('recording data and account boundaries', () => {
  it('uses the server saved calendar, keeps tombstoned history, and pages complete activity', async () => {
    mocks.rows.rules = [{ id: uuid(73), relationship_id: 'period', deleted_at: null }, { id: 'removed', relationship_id: 'period', deleted_at: '2026-01-01' }];
    mocks.progress = [{ subjectType: 'rule', subjectId: uuid(73), beneficiaryParticipantId: uuid(2), localDate: '2026-10-26', weekStartDate: '2026-10-26', timeZone: 'Pacific/Kiritimati', usageData: [2,0,0,0,0,0,0], expectedContext: { ...ruleContext(), sub: { ...ruleContext().sub, timeZone: 'Pacific/Kiritimati' } } }];
    mocks.rows.action_events = Array.from({ length: 501 }, (_, i) => ({ id: String(i), rule_id: 'removed', relationship_id: 'period' }));
    const data = await readRecordingData(scope, 'rule', true);
    expect(data.definitions.map(x => x.id)).toEqual([uuid(73)]); expect(data.events).toHaveLength(501);
    expect(data.progress[0].usageData[0]).toBe(2); expect(data.progress[0].timeZone).toBe('Pacific/Kiritimati');
    expect(mocks.requests.filter(x => x.table === 'action_events')).toHaveLength(2);
    expect(mocks.requests.every(x => x.headers.Authorization === 'Bearer token-a')).toBe(true);
    expect(mocks.requests.find(x => x.rpc).payload).toEqual({ p_expected_relationship_id: 'period', p_subject_type: 'rule' });
    expect(mocks.requests.find(x => x.table === 'rules').fields).not.toMatch(/user_id|source_snapshot|\*/);
  });
  it('does not fabricate a Sub calendar for solo Dom catalog reads', async () => {
    await readRecordingData(scope, 'punishment', false); expect(mocks.requests.some(x => x.rpc)).toBe(false);
  });
  it('reads only current-period imported history without inventing point or actor facts', async () => {
    mocks.rows.punishments = [{ id: 'p', relationship_id: 'period', title: 'Current changed title', points: 99, deleted_at: '2026-01-01' }];
    mocks.rows.punishment_history = [{ id: 'old', relationship_id: 'period', action_event_id: null, punishment_id: 'p', applied_date: '2025-01-01T00:00:00Z', points_deducted: 3, day_of_week: 2 }];
    const data = await readRecordingData(scope, 'punishment', true);
    expect(data.imported).toEqual([{ ...mocks.rows.punishment_history[0], currentTitle: 'Current changed title' }]);
    expect(data.points).toEqual([]);expect(data.definitions).toEqual([]);
    expect(mocks.requests.find(x => x.table === 'punishment_history')).toMatchObject({ filters: { relationship_id: 'period', action_event_id: null }, headers: { Authorization: 'Bearer token-a' } });
    expect(mocks.requests.find(x => x.table === 'punishment_history').fields).not.toContain('user_id');
    mocks.rows.punishment_history[0].relationship_id = 'old-period';
    await expect(readRecordingData(scope, 'punishment', true)).rejects.toThrow('different relationship');
  });
  it('rejects account switches before a request and after a late response', async () => {
    mocks.account = 'b'; await expect(readRecordingData(scope, 'rule', true)).rejects.toThrow('account changed');expect(mocks.requests).toHaveLength(0);
    mocks.account = 'a';mocks.afterRead = () => { mocks.account = 'b'; };
    await expect(readRecordingData(scope, 'rule', true)).rejects.toThrow('account changed');
  });
  it('rejects foreign periods and malformed progress instead of displaying them', async () => {
    mocks.rows.rules = [{ id: uuid(73), relationship_id: 'old' }]; await expect(readRecordingData(scope, 'rule', true)).rejects.toThrow('different relationship');
    mocks.rows.rules = [{ id: uuid(73), relationship_id: 'period' }];mocks.progress = [{ subjectType: 'rule', subjectId: uuid(73), usageData: [99] }];
    await expect(readRecordingData(scope, 'rule', true)).rejects.toThrow('Invalid weekly');
    expect(recordingKey(scope, 'rule')).not.toEqual(recordingKey({ ...scope, relationshipId: 'new' }, 'rule'));
  });
  it('rejects mismatched punishment values and beneficiary calendars from independent reads', async () => {
    const { punishmentContext } = await import('./action-queue.helpers');
    const expectedContext = punishmentContext();
    mocks.rows.punishments = [{ id: expectedContext.subjectId, relationship_id: 'period', points: 5, dom_points: 99, deleted_at: null }];
    mocks.progress = [{ subjectType: 'punishment', subjectId: expectedContext.subjectId, beneficiaryParticipantId: uuid(2),
      ...expectedContext.sub, usageData: [0,0,0,0,0,0,0], expectedContext }];
    await expect(readRecordingData(scope, 'punishment', true)).rejects.toThrow('changed while loading');
    mocks.rows.punishments[0].dom_points = 3; mocks.progress[0].localDate = '2026-10-27';
    await expect(readRecordingData(scope, 'punishment', true)).rejects.toThrow('changed while loading');
  });
  it('preserves zero/customization fields while excluding counters, owner, stock and arbitrary columns', () => {
    const values = recordingDefinitionValues('punishment', { title: 'P', points: 0, dom_points: 0, background_opacity: 0, focal_point_x: 0,
      icon_name: 'custom:data:image/png;base64,fixture', background_image_url: null, user_id: 'wrong', dom_supply: 99, usage_data: [99] });
    expect(values).toEqual({ title: 'P', points: 0, dom_points: 0, background_opacity: 0, focal_point_x: 0, icon_name: 'custom:data:image/png;base64,fixture', background_image_url: null });
    expect(() => recordingDefinitionValues('punishment', { title: 'P', points: -1, dom_points: 1 })).toThrow('whole numbers');
  });
  it('pins the intended account and period for saves without transferring ownership', async () => {
    await saveRecordingDefinition(scope, 'rule', { id: uuid(73), title: 'Changed', user_id: 'wrong', usage_data: [99] }, () => true);
    expect(mocks.requests[0]).toMatchObject({ method: 'update', payload: { title: 'Changed' }, filters: { id: uuid(73), relationship_id: 'period', deleted_at: null }, headers: { Authorization: 'Bearer token-a' } });
    mocks.requests = []; await expect(saveRecordingDefinition(scope, 'rule', { title: 'New' }, () => false)).rejects.toThrow('relationship changed');expect(mocks.requests).toHaveLength(0);
    await saveRecordingDefinition(scope, 'rule', { title: 'New' }, () => true);
    expect(mocks.requests[0].payload).toEqual({ title: 'New', user_id: 'a', relationship_id: 'period' });
  });
  it('removes only the current definition with a tombstone, never its event history', async () => {
    await removeRecordingDefinition(scope, 'punishment', 'p', () => true);
    expect(mocks.requests).toHaveLength(1);expect(mocks.requests[0]).toMatchObject({ table: 'punishments', method: 'update', filters: { id: 'p', relationship_id: 'period', deleted_at: null } });
    expect(mocks.requests[0].payload.deleted_at).toMatch(/^\d{4}-/);
  });
  it('keeps Undo available after deletion but disables reversals and permission-denied actions', () => {
    const event: any = { id: 'e', kind: 'punishment_applied', provenance: 'command' };
    expect(recordingUndoReason(event, [event], 'sub', { punishment_undo: 'both' })).toBeNull();
    expect(recordingUndoReason(event, [event, { ...event, id: 'u', reverses_event_id: 'e' }], 'sub', { punishment_undo: 'both' })).toMatch(/Already undone/);
    expect(recordingUndoReason(event, [event], 'sub', { punishment_undo: 'dom' })).toMatch(/permission/);
    expect(recordingUndoReason({ ...event, kind: 'action_undone' }, [], 'sub', {})).toMatch(/history/);
    expect(savedWeekday('2026-10-26')).toBe(0);expect(savedWeekday('2026-11-01')).toBe(6);
  });
});
