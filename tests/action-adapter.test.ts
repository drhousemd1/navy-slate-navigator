import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { createSupabaseRewardTransport } from '@/data/actions/supabase-transport';
import type { QueuedActionCommand } from '@/data/actions/contracts';
import { command, receipt, scope, uuid } from './action-queue.helpers';

const mocks = vi.hoisted(() => ({ network: vi.fn() }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const url = 'https://action-transport-fixture.invalid';
  return { supabaseBackendId: url, supabase: createClient(url, 'fixture-public-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: mocks.network },
  }) };
});
const session = (id: string) => ({ data: { session: { user: { id }, access_token: `synthetic-${id}`, token_type: 'bearer', refresh_token: 'unused', expires_in: 3600 } as Session }, error: null });
beforeEach(() => { mocks.network.mockReset(); mocks.network.mockResolvedValue(new Response(JSON.stringify(receipt()), { status: 200, headers: { 'Content-Type': 'application/json' } })); });

describe('real SDK reward adapter (network stubbed)', () => {
  it('uses the configured backend and pins actor A even if the SDK reads session B before fetch', async () => {
    const getSession = vi.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce(session(scope.accountId)).mockResolvedValue(session(uuid(99)));
    const transport = createSupabaseRewardTransport();
    const result = await transport.execute(command, { ...scope, backendId: transport.backendId }, new AbortController().signal);
    expect(result.kind).toBe('confirmed'); expect(getSession).toHaveBeenCalledTimes(2);
    const [url, init] = mocks.network.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://action-transport-fixture.invalid/rest/v1/rpc/execute_reward_command');
    expect(new Headers(init.headers).get('Authorization')).toBe(`Bearer synthetic-${scope.accountId}`);
    expect(JSON.parse(init.body as string)).toMatchObject({ p_command_id: command.commandId, p_expected_relationship_id: scope.relationshipId, p_action: 'reward_buy' });
  });
  it('does not call RPC when the current account does not match the captured command account', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue(session(uuid(99)));
    const transport = createSupabaseRewardTransport();
    expect((await transport.execute(command, { ...scope, backendId: transport.backendId }, new AbortController().signal)).kind).toBe('not_sent');
    expect(mocks.network).not.toHaveBeenCalled();
  });
  it.each([
    ['task_complete', 'execute_task_command', 'p_task_id'],
    ['rule_violation', 'execute_recording_command', 'p_rule_id'],
    ['punishment_apply', 'execute_recording_command', 'p_punishment_id'],
    ['undo', 'undo_action', 'p_event_id'],
  ] as const)('sends %s through the real SDK with the selected RPC and checked actor', async (kind, rpc, target) => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce(session(scope.accountId)).mockResolvedValue(session(uuid(99)));
    const transport = createSupabaseRewardTransport();
    const input: QueuedActionCommand = { commandId: uuid(4), expectedRelationshipId: scope.relationshipId,
      ...(kind === 'task_complete' ? { kind, taskId: uuid(5) }
        : kind === 'rule_violation' ? { kind, ruleId: uuid(5) }
        : kind === 'punishment_apply' ? { kind, punishmentId: uuid(5) } : { kind, eventId: uuid(5) }) };
    const data = receipt(input);
    const progress = { beneficiaryParticipantId: scope.participantId, timeZone: 'America/Boise', localDate: '2026-10-26',
      weekStartDate: '2026-10-26', weekIdentifier: '2026-W44', usageData: [1,0,0,0,0,0,0], currentCount: 1, deleted: false };
    if (kind === 'task_complete') data.taskProgress = { ...progress, taskId: uuid(5), currency: 'sub', frequency: 'daily', target: 2, completed: false, lastCompletedDate: '2026-10-26' };
    if (kind === 'rule_violation' || kind === 'punishment_apply') data.recordingProgress = { ...progress, subjectId: uuid(5), subjectType: kind === 'rule_violation' ? 'rule' : 'punishment' };
    if (kind !== 'undo') data.pointDeltas = kind === 'rule_violation' ? [] : [{ participantId: scope.participantId, currency: 'sub', amount: kind === 'task_complete' ? 5 : -3 }];
    mocks.network.mockResolvedValue(new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    expect((await transport.execute(input, { ...scope, backendId: transport.backendId }, new AbortController().signal)).kind).toBe('confirmed');
    const [url, init] = mocks.network.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://action-transport-fixture.invalid/rest/v1/rpc/${rpc}`);
    expect(new Headers(init.headers).get('Authorization')).toBe(`Bearer synthetic-${scope.accountId}`);
    const payload = JSON.parse(init.body as string);
    expect(payload).toMatchObject({ p_command_id: input.commandId, p_expected_relationship_id: scope.relationshipId, [target]: uuid(5) });
    if (kind === 'undo') expect(Object.keys(payload).sort()).toEqual(['p_command_id', 'p_event_id', 'p_expected_relationship_id']);
  });
});
