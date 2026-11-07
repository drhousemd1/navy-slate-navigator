import { describe, expect, it, vi } from 'vitest';
import { decodeActionCommand, decodeActionReceipt, decodeExpectedContext } from '@/data/actions/contracts';
import { decodeTaskProgress, reviewedTaskContext, taskDefinitionPayload } from '@/data/tasks/actionReadModel';
import { assertTaskCapacity } from '@/domain/actions/accounting';
import { projectActivity } from '@/data/metrics/projection';
import { receipt, scope, taskContext, uuid } from './action-queue.helpers';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, supabaseBackendId: 'local' }));
const deadline = { date: '2026-10-25', time: '09:00', weekday: null };
const context = { ...taskContext(), version: 2, frequency: 'once', target: 1, mandatory: true, deadline, dueAt: '2026-10-25T15:00:00+00:00' } as const;
const progress = { taskId: context.subjectId, beneficiaryParticipantId: scope.participantId, currency: 'sub', timeZone: context.timeZone,
  localDate: context.localDate, weekStartDate: context.weekStartDate, weekIdentifier: '2026-W44', frequency: 'once', target: 1, currentCount: 1,
  usageData: [0,0,0,0,0,0,0], completed: true, lastCompletedDate: '2026-10-25', deleted: false,
  mandatory: true, deadline, dueAt: context.dueAt, overdue: false, lastCompletionLate: true, expectedContext: context } as const;
const task = { id: context.subjectId, points: 5, is_dom_task: false, frequency: 'once', frequency_count: 1, mandatory: true,
  deadline_date: deadline.date, deadline_time: '09:00:00', deadline_weekday: null };
const command = { commandId: uuid(800), expectedRelationshipId: scope.relationshipId, kind: 'task_complete', taskId: task.id, expectedContext: context } as const;
const form = { title: 'One-time task', ...task, deadline_time: '09:00' } as any;
describe('task type contracts', () => {
  it('accepts completed lifetime progress even after its marks have left the displayed week', () => {
    expect(decodeTaskProgress(progress)).toEqual(progress);
    expect(() => decodeTaskProgress({ ...progress, frequency: 'weekly' })).toThrow('counters');
    expect(() => decodeTaskProgress({ ...progress, target: 2 })).toThrow('one-time');
    expect(() => assertTaskCapacity('once', 1, 1)).toThrow();
    expect(() => assertTaskCapacity('once', 1, 0)).not.toThrow();
  });
  it('retains v1 review facts and accepts fully reviewed v2 actions', () => {
    const original = taskContext();
    expect(decodeExpectedContext(original)).toEqual(original);
    expect(decodeActionCommand(command)).toEqual(command);
    expect(() => decodeExpectedContext({ ...context, target: 2 })).toThrow();
    expect(() => decodeExpectedContext({ ...context, version: 1 })).toThrow();
    expect(() => decodeExpectedContext({ ...context, dueAt: null })).toThrow();
  });
  it.each([
    { date: '2026-02-30', time: '09:00', weekday: null },
    { date: '2026-10-25', time: '24:00', weekday: null },
    { date: '2026-10-25', time: '09:00:30', weekday: null },
    { date: '2026-10-25', time: '09:00', weekday: 1 },
    { date: null, time: '09:00', weekday: null },
  ])('rejects malformed one-time schedule %j', value => {
    expect(() => decodeExpectedContext({ ...context, deadline: value })).toThrow();
    expect(() => taskDefinitionPayload({ ...form, deadline_date: value.date, deadline_time: value.time, deadline_weekday: value.weekday })).toThrow();
  });
  it('validates daily/weekly deadline shapes and does not silently turn a date into a recurring deadline', () => {
    expect(taskDefinitionPayload({ ...form, frequency: 'daily', deadline_date: null })).toMatchObject({ deadline_time: '09:00' });
    expect(taskDefinitionPayload({ ...form, frequency: 'weekly', deadline_date: null, deadline_weekday: 7 })).toMatchObject({ deadline_weekday: 7 });
    expect(() => taskDefinitionPayload({ ...form, frequency: 'weekly' })).toThrow();
    expect(() => taskDefinitionPayload({ ...form, frequency: 'daily' })).toThrow();
    expect(taskDefinitionPayload({ ...form, deadline_date: null, deadline_time: null })).toMatchObject({ mandatory: true, deadline_time: null });
  });
  it('refuses stale schedule facts before enqueue, including role, due instant, mandatory flag and date edits', () => {
    expect(reviewedTaskContext(task, progress)).toEqual(context);
    for (const edit of [{ mandatory: false }, { deadline_date: '2026-10-26' }, { deadline_time: '10:00' }, { is_dom_task: true }]) {
      expect(() => reviewedTaskContext({ ...task, ...edit }, progress)).toThrow();
    }
    expect(() => reviewedTaskContext(task, { ...progress, dueAt: '2026-10-26T15:00:00Z' })).toThrow();
    expect(() => reviewedTaskContext({ ...task, frequency: 'daily', frequency_count: 2 }, { ...progress, expectedContext: taskContext() })).toThrow();
  });
  it('decodes lifetime completion receipts and rejects mismatched reviewed schedule fields', () => {
    const value = { ...receipt(command), taskProgress: progress, pointDeltas: [{ participantId: scope.participantId, currency: 'sub', amount: 5 }] };
    expect(decodeActionReceipt(value, command)).toEqual(value);
    expect(() => decodeActionReceipt({ ...value, taskProgress: { ...progress, mandatory: false } }, command)).toThrow();
    expect(() => decodeActionReceipt({ ...value, taskProgress: { ...progress, target: 2 } }, command)).toThrow();
  });
  it('metrics use the original completion calendar; late/one-time status and future edits do not move it', () => {
    const event = { id: uuid(801), relationship_id: scope.relationshipId, kind: 'task_completed', beneficiary_participant_id: scope.participantId,
      subject: { role: 'sub' as const }, calendar: { participantId: scope.participantId, timeZone: context.timeZone, localDate: context.localDate, weekStartDate: context.weekStartDate },
      reverses_event_id: null, definition_values: { frequency: 'once', mandatory: true, late: true, dueAt: context.dueAt } };
    const ranges = [{ role: 'sub' as const, timeZone: 'Pacific/Kiritimati', start: '2026-10-26', end: '2026-11-02' }];
    const source = { mode: 'atomic' as const, events: [event], legacy: [] };
    expect(projectActivity(source, ranges).dataArray[0].subTasksCompleted).toBe(1);
    expect(projectActivity({ ...source, events: [event, { ...event, id: uuid(802), kind: 'action_undone', reverses_event_id: event.id }] }, ranges).totals.subTasksCompleted).toBe(0);
  });
});
