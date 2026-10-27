import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseBackendId } from '@/integrations/supabase/client';
import { acknowledgeRewardFeedback, readAccountingEnabled, readRewardActionData, rewardActionKey, accountingStatusKey } from '@/data/rewards/actionReadModel';
import { readTaskActionData, saveTaskDefinition, removeTaskDefinition, taskActionKey } from '@/data/tasks/actionReadModel';
import { readRecordingData, saveRecordingDefinition, removeRecordingDefinition, recordingKey } from '@/data/recordings/readModel';
import { readMetricsSource, metricsScopeKey } from '@/data/metrics/readModel';
import { useAtomicRewardsData } from '@/data/rewards/useAtomicRewardsData';
import { useEditorDraftScope } from '@/hooks/useEditorDraftScope';

const mocks = vi.hoisted(() => ({ network: vi.fn(), generation: '', rotateAfterWrite: false, rotateAfterRead: false, actions: null as any, identity: null as any }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const url = 'https://generation-fixture.invalid';
  return { supabaseBackendId: url, supabase: createClient(url, 'fixture-public-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: mocks.network },
  }) };
});
vi.mock('@/contexts/ActionCommandsContext', () => ({ useActionCommands: () => mocks.actions }));
vi.mock('@/contexts/UserIdsContext', () => ({ useUserIds: () => mocks.identity }));
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const scope = { backendId: supabaseBackendId, accountId: uuid(1), participantId: uuid(2), relationshipId: uuid(3), relationshipSessionId: uuid(4) };
const nextScope = { ...scope, relationshipSessionId: uuid(5) };
const identity = () => ({ status: 'ready_solo', relationship_status: 'active', user_id: scope.accountId,
  relationship_id: scope.relationshipId, participant_id: scope.participantId, relationship_session_id: mocks.generation });
const response = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
const task = { title: 'Task', points: 0, frequency: 'daily', frequency_count: 1 } as any;
const writes = () => mocks.network.mock.calls.filter(([url, init]) => !String(url).includes('/get_my_identity') && !String(url).includes('/get_task_progress') && init.method !== 'GET');
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
beforeEach(() => {
  mocks.generation = scope.relationshipSessionId; mocks.rotateAfterWrite = false; mocks.rotateAfterRead = false;
  mocks.actions = { scope, mode: 'atomic', data: { rewards: [], wallets: [], lots: [] }, refresh: vi.fn().mockResolvedValue(undefined) };
  mocks.identity = { canAccessData: true, isLoadingUserIds: false, currentUserId: scope.accountId, relationshipId: scope.relationshipId,
    relationshipSessionId: scope.relationshipSessionId, currentRole: 'sub', permissions: { definition_manage: 'both' } };
  vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: { user: { id: scope.accountId }, access_token: 'fixture-token' } as Session }, error: null });
  mocks.network.mockReset().mockImplementation((url: string, init: RequestInit) => {
    if (url.includes('/get_my_identity')) return response(identity());
    if (url.includes('/get_task_progress')) return response([]);
    if (init.method !== 'GET') {
      if (mocks.rotateAfterWrite) mocks.generation = nextScope.relationshipSessionId;
      return response(url.includes('/acknowledge_action_feedback') ? null : { id: uuid(9), relationship_id: scope.relationshipId });
    }
    if (mocks.rotateAfterRead) mocks.generation = nextScope.relationshipSessionId;
    return response(url.includes('/action_accounting_periods') ? { relationship_id: scope.relationshipId, accounting_enabled: true } : []);
  });
});
afterEach(cleanup);

describe('real SDK relationship-session read/write boundary (network stubbed)', () => {
  const readers = [
    ['accounting', () => readAccountingEnabled(scope)], ['rewards', () => readRewardActionData(scope)],
    ['tasks', () => readTaskActionData(scope)], ['recordings', () => readRecordingData(scope, 'rule', false)],
    ['metrics', () => readMetricsSource(scope, 'atomic')],
  ] as const;
  it.each(readers)('rejects %s results if the same period is continued during the operation', async (_name, read) => {
    mocks.rotateAfterRead = true;
    await expect(read()).rejects.toThrow('connection changed');
    expect(mocks.network.mock.calls.every(([, init]) => new Headers(init.headers).get('Authorization') === 'Bearer fixture-token')).toBe(true);
    expect(writes()).toHaveLength(0);
  });
  it('separates all current query keys by session even when every other identity field is unchanged', () => {
    for (const key of [rewardActionKey, accountingStatusKey, taskActionKey, metricsScopeKey, (s: typeof scope) => recordingKey(s, 'rule')]) {
      expect(key(scope)).not.toEqual(key(nextScope));
    }
  });
  const definitions = [
    ['create task', () => saveTaskDefinition(scope, task)], ['edit task', () => saveTaskDefinition(scope, task, uuid(9))],
    ['remove task', () => removeTaskDefinition(scope, uuid(9))],
    ['create rule', () => saveRecordingDefinition(scope, 'rule', { title: 'Rule' }, () => true)],
    ['edit punishment', () => saveRecordingDefinition(scope, 'punishment', { id: uuid(9), title: 'P', points: 0, dom_points: 0 }, () => true)],
    ['remove punishment', () => removeRecordingDefinition(scope, 'punishment', uuid(9), () => true)],
  ] as const;
  it.each(definitions)('%s sends the reviewed session header and rejects a late generation change', async (_name, write) => {
    await write();
    expect(writes()).toHaveLength(1);
    expect(new Headers(writes()[0][1].headers).get('x-relationship-session-id')).toBe(scope.relationshipSessionId);
    mocks.rotateAfterWrite = true;
    await expect(write()).rejects.toThrow('connection changed');
  });
  it('rejects a missing or stale generation before any definition mutation or acknowledgement', async () => {
    await expect(saveTaskDefinition({ ...scope, relationshipSessionId: null as any }, task)).rejects.toThrow('could not be verified');
    expect(mocks.network).not.toHaveBeenCalled();
    mocks.generation = nextScope.relationshipSessionId;
    await expect(removeRecordingDefinition(scope, 'rule', uuid(9), () => true)).rejects.toThrow('connection changed');
    await expect(acknowledgeRewardFeedback(scope, uuid(10))).rejects.toThrow('connection changed');
    expect(writes()).toHaveLength(0);
  });
  it('acknowledges only the reviewed session and never reports late acknowledgement as current success', async () => {
    await acknowledgeRewardFeedback(scope, uuid(10), 'action_confirmed');
    expect(JSON.parse(writes()[0][1].body)).toEqual({ p_expected_relationship_id: scope.relationshipId,
      p_expected_relationship_session_id: scope.relationshipSessionId, p_event_id: uuid(10), p_kind: 'action_confirmed' });
    mocks.rotateAfterWrite = true;
    await expect(acknowledgeRewardFeedback(scope, uuid(10))).rejects.toThrow('connection changed');
  });
  it('binds reward editing and keeps failure after a session switch during its final refresh', async () => {
    const pending = deferred<void>(); mocks.actions.refresh.mockReturnValue(pending.promise);
    const { result, rerender } = renderHook(() => useAtomicRewardsData());
    const saving = result.current.saveReward({ rewardData: { title: 'Reward', cost: 0 }, currentIndex: null });
    const outcome = expect(saving).rejects.toThrow('relationship changed');
    await vi.waitFor(() => expect(mocks.actions.refresh).toHaveBeenCalled());
    expect(new Headers(writes()[0][1].headers).get('x-relationship-session-id')).toBe(scope.relationshipSessionId);
    mocks.actions = { ...mocks.actions, scope: nextScope }; rerender();
    await act(async () => { pending.resolve(); await outcome; });
  });
  it('creates no draft scope from missing or invalid generation and rotates only on verified identity', () => {
    const { result, rerender } = renderHook(() => useEditorDraftScope());
    expect(result.current?.relationshipSessionId).toBe(scope.relationshipSessionId);
    for (const generation of [null, undefined, 'invalid']) {
      mocks.identity.relationshipSessionId = generation; rerender(); expect(result.current).toBeNull();
    }
    mocks.identity.relationshipSessionId = nextScope.relationshipSessionId; rerender();
    expect(result.current?.relationshipSessionId).toBe(nextScope.relationshipSessionId);
  });
});
