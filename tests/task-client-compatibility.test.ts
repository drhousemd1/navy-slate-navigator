// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { z } from 'zod';
import { ActionCommandQueue } from '@/data/actions/queue';
import { createActionTransport } from '@/data/actions/transport';
import type { ActionTransport } from '@/data/actions/contracts';
import { MemoryQueueStore, TestConnection, scope, uuid } from './action-queue.helpers';

// Exact accepted old decoder sources, not a rewritten approximation. Runtime
// dependencies are inert; only pure decode functions are exercised, with real Zod.
const folder = new URL('./fixtures/task-client-3d9e61c2/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', folder), 'utf8'));
function frozen(name: 'contracts' | 'read-model' | 'transport', contracts?: Record<string, unknown>) {
  const source = readFileSync(new URL(`${name}.ts.txt`, folder), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe(manifest.files[name].sha256);
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: Record<string, (...args: unknown[]) => unknown> = {};
  const require = (id: string) => {
    if (id === 'zod') return { z };
    if (id === '@/data/actions/contracts' || id === './contracts') return contracts;
    if (id === '@/integrations/supabase/client') return { supabase: {}, supabaseBackendId: scope.backendId };
    if (id === '@tanstack/react-query' || id === '@/data/rewards/actionReadModel') return {};
    throw new Error(`Unexpected frozen decoder dependency: ${id}`);
  };
  new Function('require', 'exports', output)(require, exports);
  return exports;
}
const legacy = frozen('contracts');
const oldRead = frozen('read-model', legacy);
const neutralContext = { version: 2, kind: 'task_complete', subjectId: uuid(71), beneficiaryParticipantId: scope.participantId,
  currency: 'sub', points: 6, frequency: 'daily', target: 1, mandatory: false, deadline: { date: null, time: null, weekday: null }, dueAt: null,
  timeZone: 'America/Boise', localDate: '2026-11-07', weekStartDate: '2026-11-02' };
// All fields produced by 0200 _actions_task_progress, including explicit nulls.
const progress = { taskId: uuid(71), beneficiaryParticipantId: scope.participantId, currency: 'sub', timeZone: 'America/Boise',
  localDate: '2026-11-07', weekStartDate: '2026-11-02', weekIdentifier: '2026-W45', frequency: 'daily', target: 1,
  currentCount: 1, usageData: [0, 0, 0, 0, 0, 1, 0], completed: true, lastCompletedDate: '2026-11-07', deleted: false,
  mandatory: false, deadline: neutralContext.deadline, dueAt: null, overdue: false, lastCompletionLate: false, expectedContext: neutralContext };
const { mandatory: _mandatory, deadline: _deadline, dueAt: _dueAt, ...v1 } = neutralContext;
const command = { commandId: uuid(801), expectedRelationshipId: scope.relationshipId, kind: 'task_complete', taskId: uuid(71), expectedContext: { ...v1, version: 1 } };
const receipt = { commandId: command.commandId, relationshipId: scope.relationshipId, relationshipSessionId: scope.relationshipSessionId,
  eventIds: [uuid(802)], confirmedAt: '2026-11-07T11:00:00+00:00', balances: [{ participantId: scope.participantId, currency: 'sub', balance: 106 }],
  pointDeltas: [{ participantId: scope.participantId, currency: 'sub', amount: 6 }], availableRewardQuantities: [], refunds: [],
  feedback: [{ eventId: uuid(802), recipientParticipantId: scope.participantId, subjectTitle: 'Neutral task', kind: 'action_confirmed' }], taskProgress: progress };

const oldTransport = frozen('transport', legacy);
const legacyProgress = { ...progress, expectedContext: command.expectedContext };
const legacyReceipt = { ...receipt, taskProgress: legacyProgress };
const updateRequired = { data: null, status: 400, error: { code: '22023', message: 'TASK_CLIENT_UPDATE_REQUIRED' } };

// These offline samples establish the exact old decoder's accepted representation,
// not SQL execution. The rollback SQL emits real values for the optional final test.
describe('frozen task client against task-type response', () => {
  it('reproduces both original failures on the complete unprojected neutral v2 response', () => {
    expect(() => oldRead.decodeTaskProgress(progress)).toThrow();
    expect(() => legacy.decodeActionReceipt(receipt, command, scope.relationshipSessionId)).toThrow();
  });
  it('accepts the neutral v1 representation with all explicit zeros/nulls retained', () => {
    expect(oldRead.decodeTaskProgress(legacyProgress)).toMatchObject({ currentCount: 1, expectedContext: command.expectedContext });
    expect(legacy.decodeActionReceipt(legacyReceipt, command, scope.relationshipSessionId)).toMatchObject({ commandId: command.commandId, taskProgress: { expectedContext: command.expectedContext } });
    expect(legacyProgress).toMatchObject({ mandatory: false, dueAt: null, deadline: { date: null, time: null, weekday: null }, usageData: [0, 0, 0, 0, 0, 1, 0] });
  });
  it.each([
    { frequency: 'once' }, { mandatory: true }, { deadline: { date: null, time: '09:00', weekday: null }, dueAt: '2026-11-07T09:00:00-07:00' },
  ])('does not pretend that an old decoder understands new schedule facts: %j', schedule => {
    const unsupported = { ...progress, ...schedule, expectedContext: { ...neutralContext, ...schedule } };
    expect(() => oldRead.decodeTaskProgress(unsupported)).toThrow();
    expect(() => legacy.decodeActionReceipt({ ...receipt, taskProgress: unsupported }, command, scope.relationshipSessionId)).toThrow();
  });
  it('the frozen transport and unchanged queue keep an update rejection without automatic resend', async () => {
    const queueSource = readFileSync(new URL('../src/data/actions/queue.ts', import.meta.url));
    expect(createHash('sha256').update(queueSource).digest('hex')).toBe(manifest.unchangedQueue.sha256);
    const callRpc = vi.fn(async () => updateRequired);
    const transport = oldTransport.createActionTransport({ backendId: scope.backendId,
      readSession: async () => ({ accountId: scope.accountId, accessToken: 'synthetic' }), callRpc }) as ActionTransport;
    const store = new MemoryQueueStore(); const connection = new TestConnection();
    const queue = new ActionCommandQueue({ store, connection, transport, uuid: () => uuid(803) });
    vi.useFakeTimers();
    try {
      queue.setContext(scope); await queue.enqueue({ kind: 'undo', eventId: receipt.eventIds[0] });
      connection.online = true; await queue.flush();
      expect((await store.list())[0]).toMatchObject({ state: { status: 'rejected' }, attempts: 1,
        problem: { code: 'TASK_CLIENT_UPDATE_REQUIRED', retryable: false, message: 'The server rejected this action. Refresh its details before trying again.' } });
      await vi.advanceTimersByTimeAsync(60_000); await queue.flush();
      connection.setOnline(false); connection.setOnline(true); await queue.flush();
      expect(callRpc).toHaveBeenCalledTimes(1);
      expect((await store.list())[0].command).toMatchObject({ kind: 'undo', eventId: receipt.eventIds[0], commandId: uuid(803) });
    } finally { queue.dispose(); vi.useRealTimers(); }
  });
  it('current transport provides explicit update wording for the same permanent rejection', async () => {
    const transport = createActionTransport({ backendId: scope.backendId,
      readSession: async () => ({ accountId: scope.accountId, accessToken: 'synthetic' }), callRpc: async () => updateRequired });
    expect(await transport.execute({ kind: 'undo', eventId: receipt.eventIds[0], commandId: uuid(804), expectedRelationshipId: scope.relationshipId }, scope, new AbortController().signal))
      .toMatchObject({ kind: 'rejected', problem: { retryable: false, code: 'TASK_CLIENT_UPDATE_REQUIRED', message: expect.stringContaining('Update or reload') } });
  });
  it.skipIf(!process.env.OBEDIENCE_TASK_COMPATIBILITY_EVIDENCE)('decodes the actual rollback-SQL progress and receipt in the frozen client', () => {
    const evidence = JSON.parse(readFileSync(process.env.OBEDIENCE_TASK_COMPATIBILITY_EVIDENCE!, 'utf8'));
    expect(oldRead.decodeTaskProgress(evidence.progress)).toMatchObject({ expectedContext: evidence.command.expectedContext });
    expect(legacy.decodeActionReceipt(evidence.receipt, evidence.command, evidence.session)).toMatchObject({ commandId: evidence.command.commandId });
  });
});
