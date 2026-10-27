import { decodeQueueEntry } from '@/data/actions/contracts';
import { ruleContext, punishmentContext, uuid, scope as queueScope } from './action-queue.helpers';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AtomicRulesContent } from '@/components/rule/AtomicRulesContent';
import { AtomicPunishmentsContent } from '@/components/punishments/AtomicPunishmentsContent';
import { RecordingActivity } from '@/components/recordings/RecordingActivity';
const mocks = vi.hoisted(() => ({ state: null as any, actions: null as any, identity: null as any, navigate: vi.fn() }));
vi.mock('@/data/recordings/useRecordingData', () => ({ useRecordingData: () => mocks.state }));
vi.mock('@/contexts/ActionCommandsContext', () => ({ useActionCommands: () => mocks.actions }));
vi.mock('@/contexts/UserIdsContext', () => ({ useUserIds: () => mocks.identity }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, supabaseBackendId: 'fixture' }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/components/common/PointsBubbles', () => ({ default: () => <div>Confirmed balances</div> }));
vi.mock('@/components/RuleEditor', () => ({ default: ({ ruleData, preserveHistory }: any) => <div role="dialog">{ruleData?.title ?? 'New rule'} {preserveHistory && 'History preserved'}</div> }));
vi.mock('@/components/PunishmentEditor', () => ({ default: ({ punishmentData, preserveHistory }: any) => <div role="dialog">{punishmentData?.title ?? 'New punishment'} {preserveHistory && 'History preserved'}</div> }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), debug: vi.fn(), info: vi.fn() } }));
const base = { id: uuid(73), relationship_id: 'period', title: 'Fixture', description: 'Description', priority: 'High', calendar_color: '#123456', title_color: '#ffffff', subtext_color: '#ffffff',
  deleted_at: null, points: 10, dom_points: 4, dom_supply: 0, created_at: '2026-01-01', background_opacity: 0, focal_point_x: 0, focal_point_y: 0 };
const progress = { subjectId: base.id, subjectType: 'rule', beneficiaryParticipantId: uuid(2), localDate: '2026-10-26', weekStartDate: '2026-10-26', timeZone: 'Pacific/Kiritimati', expectedContext: { ...ruleContext(base.id), sub: { ...ruleContext().sub, timeZone: 'Pacific/Kiritimati' } }, usageData: [1,0,0,0,0,0,0], currentCount: 1 };
const event = { id: 'event', relationship_id: 'period', rule_id: null, punishment_id: 'definition', kind: 'punishment_applied', provenance: 'command', actor_participant_id: 'partner',
  subject: { title: 'Original title' }, calendar: { localDate: '2026-10-26', timeZone: 'Pacific/Kiritimati' }, recorded_at: '2026-10-26T10:00:00Z', reverses_event_id: null };
beforeEach(() => {
  mocks.actions = { mode: 'atomic', scope: { accountId: 'a', relationshipId: 'period' }, entries: [], confirmed: [], enqueue: vi.fn().mockResolvedValue(undefined), retry: vi.fn(), cancelUnsent: vi.fn() };
  mocks.identity = { currentRole: 'sub', participantId: 'me', permissions: { punishment_undo: 'both', rule_violation_undo: 'both' } };
  mocks.state = { data: { definitions: [base], events: [], points: [], progress: [progress], imported: [] }, canManage: true, actionReason: null,
    pending: false, isLoading: false, error: null, refresh: vi.fn(), save: vi.fn(), remove: vi.fn(), actions: mocks.actions };
  mocks.navigate.mockReset();
});
afterEach(cleanup);
describe('actual recording page components', () => {
  it('records a rule through the queue once and navigates only after durable save', async () => {
    let done!: () => void;mocks.actions.enqueue.mockImplementation(() => new Promise<void>(resolve => { done = resolve; }));
    const { container } = render(<AtomicRulesContent />);
    const button = screen.getByRole('button', { name: 'Rule Broken' });
    fireEvent.click(button);fireEvent.click(button);
    expect(mocks.actions.enqueue).toHaveBeenCalledExactlyOnceWith({ kind: 'rule_violation', ruleId: base.id, expectedContext: progress.expectedContext });
    expect(mocks.navigate).not.toHaveBeenCalled();expect(button.hasAttribute('disabled')).toBe(true);
    expect(container.querySelectorAll('[style*="background-color: rgb(18, 52, 86)"]')).toHaveLength(1);
    done();await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/punishments'));
  });
  it('keeps a rejected rule on the current page and leaves its saved count unchanged', async () => {
    mocks.actions.enqueue.mockRejectedValue(new Error('Device storage unavailable'));
    render(<AtomicRulesContent />);fireEvent.click(screen.getByRole('button', { name: 'Rule Broken' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Device storage unavailable');expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.state.data.progress[0].currentCount).toBe(1);
  });
  it('records punishment even with zero legacy supply; pending prevents repeats without optimistic count updates', async () => {
    mocks.actions.scope = queueScope;
    mocks.state.data.progress = [{ ...progress, subjectType: 'punishment', expectedContext: { ...punishmentContext(base.id), subDeduction: 10, domAward: 4, sub: { ...punishmentContext().sub, timeZone: progress.timeZone } } }];
    const ref = { current: {} };const { rerender } = render(<AtomicPunishmentsContent contentRef={ref} />);
    fireEvent.click(screen.getByRole('button', { name: 'Punish' }));
    await waitFor(() => expect(mocks.actions.enqueue).toHaveBeenCalledExactlyOnceWith({ kind: 'punishment_apply', punishmentId: base.id, expectedContext: mocks.state.data.progress[0].expectedContext }));
    expect(mocks.state.data.progress[0].currentCount).toBe(1);
    const command = { commandId: uuid(901), expectedRelationshipId: queueScope.relationshipId, kind: 'punishment_apply', punishmentId: base.id,
      expectedContext: mocks.state.data.progress[0].expectedContext };
    const saved = decodeQueueEntry({ version: 1, sequence: 1, scope: queueScope, command, createdAt: 1, updatedAt: 1,
      state: { status: 'pending', command }, attempts: 0, everSent: false, nextAttemptAt: 1, problem: null, lease: null });
    mocks.state.pending = true;mocks.actions.entries = [{ ...saved, canReplay: true, canCancel: true, canReconcile: false }];
    rerender(<AtomicPunishmentsContent contentRef={ref} />);
    expect(screen.getByRole('button', { name: 'Punish' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/Pending; saved on this device/)).toBeTruthy();
  });
  it('shows both affected calendars and saves the same reviewed punishment values, not the browser date', async () => {
    const expectedContext = { ...punishmentContext(base.id), subDeduction: 10, domAward: 4,
      sub: { ...punishmentContext().sub, timeZone: progress.timeZone },
      dom: { ...punishmentContext().dom, localDate: '2026-10-25', weekStartDate: '2026-10-19' } };
    mocks.state.data.progress = [{ ...progress, subjectType: 'punishment', expectedContext }];
    render(<AtomicPunishmentsContent contentRef={{ current: {} }} />);
    expect(screen.getByText('Sub actions: 2026-10-26 · Pacific/Kiritimati')).toBeTruthy();
    expect(screen.getByText('Dom award: 2026-10-25 · America/Boise')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Punish' }));
    await waitFor(() => expect(mocks.actions.enqueue).toHaveBeenCalledWith({ kind: 'punishment_apply', punishmentId: base.id, expectedContext }));
  });
  it('shows permission and missing-Sub explanations while preserving editor access when allowed', () => {
    mocks.state.actionReason = 'Link a Sub partner before recording this action.';
    const ref = { current: {} as { handleAddNewPunishment?: () => void } };
    render(<AtomicPunishmentsContent contentRef={ref} />);
    expect(screen.getByRole('button', { name: 'Punish' }).hasAttribute('disabled')).toBe(true);expect(screen.getByText(/Link a Sub partner/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit punishment' }));expect(screen.getByRole('dialog').textContent).toContain('Fixture History preserved');
  });
  it('opens the preserved Rules Add event and prevents editing when current permission denies it', () => {
    const { container, rerender } = render(<AtomicRulesContent />);
    fireEvent(container.querySelector('.RulesContent')!, new Event('add-new-rule'));
    expect(screen.getByRole('dialog').textContent).toContain('New rule History preserved');
    cleanup();mocks.state.canManage = false;
    render(<AtomicRulesContent />);expect(screen.getByRole('button', { name: 'Edit Fixture' }).hasAttribute('disabled')).toBe(true);
  });
});
describe('verified and imported recording history', () => {
  it('does not show punishment feedback on Rules after a punishment was recorded, deleted and undone', () => {
    mocks.actions.confirmed = [
      { command: { kind: 'punishment_apply' }, state: { status: 'confirmed', receipt: { feedback: [{ subjectTitle: 'Deleted punishment' }], pointDeltas: [{ participantId: 'me', currency: 'sub', amount: -10 }] } } },
      { command: { kind: 'undo', eventId: 'event' }, state: { status: 'confirmed', receipt: { feedback: [{ subjectTitle: 'Deleted punishment' }], recordingProgress: { subjectType: 'punishment' } } } },
    ];
    const { rerender } = render(<RecordingActivity type="rule" data={mocks.state.data} refresh={vi.fn()} />);
    expect(screen.queryByRole('status')).toBeNull();expect(screen.queryByText('Punishment recorded')).toBeNull();
    rerender(<RecordingActivity type="punishment" data={{ ...mocks.state.data, definitions: [], events: [event] }} refresh={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toContain('Undo confirmed');expect(screen.getByRole('status').textContent).not.toContain('-10 points');
  });
  it('keeps rule redirect feedback on Punishments and replaces it with its matching Undo', () => {
    mocks.actions.confirmed = [{ command: { kind: 'rule_violation' }, state: { status: 'confirmed', receipt: { feedback: [{ subjectTitle: 'Rule fixture' }] } } }];
    const { rerender } = render(<RecordingActivity type="punishment" data={mocks.state.data} refresh={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toContain('Rule violation recorded');
    mocks.actions.confirmed.push({ command: { kind: 'undo', eventId: 'rule-event' }, state: { status: 'confirmed', receipt: { feedback: [{ subjectTitle: 'Rule fixture' }], recordingProgress: { subjectType: 'rule' } } } });
    rerender(<RecordingActivity type="punishment" data={mocks.state.data} refresh={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toContain('Undo confirmed');
    rerender(<RecordingActivity type="rule" data={mocks.state.data} refresh={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toContain('Undo confirmed');
  });
  it('shows exact deltas and each saved calendar, then queues Undo by immutable event ID', async () => {
    const data: any = { ...mocks.state.data, definitions: [], events: [event], points: [{ id: 'debit', event_id: 'event', currency: 'sub', amount: -3, calendar: event.calendar },
      { id: 'credit', event_id: 'event', currency: 'dom', amount: 4, calendar: { localDate: '2026-10-25', timeZone: 'America/Boise' } }] };
    render(<RecordingActivity type="punishment" data={data} refresh={vi.fn()} />);fireEvent.click(screen.getByText('Punishment History'));
    expect(screen.getByText('Sub balance: -3 points')).toBeTruthy();expect(screen.getByText('Dom calendar: 2026-10-25 in America/Boise')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo punishment' }));
    await waitFor(() => expect(mocks.actions.enqueue).toHaveBeenCalledWith({ kind: 'undo', eventId: 'event' }));
  });
  it('retains original and correction with disabled repeated Undo after definition deletion', () => {
    const data: any = { ...mocks.state.data, definitions: [], events: [event, { ...event, id: 'reversal', kind: 'action_undone', reverses_event_id: 'event' }] };
    render(<RecordingActivity type="punishment" data={data} refresh={vi.fn()} />);fireEvent.click(screen.getByText('Punishment History'));
    expect(screen.getByText('Undone: Original title')).toBeTruthy();expect(screen.getByRole('button', { name: 'Undo punishment' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/Already undone; both records/)).toBeTruthy();
  });
  it('labels imported timestamps and deductions as evidence, without actor, inferred points or Undo', () => {
    const data: any = { ...mocks.state.data, imported: [{ id: 'legacy', action_event_id: null, currentTitle: 'Current name', applied_date: '2025-01-01T00:00:00Z', points_deducted: 9 }] };
    render(<RecordingActivity type="punishment" data={data} refresh={vi.fn()} />);fireEvent.click(screen.getByText('Punishment History'));
    const imported = within(screen.getByRole('region', { name: 'Imported history' }));
    expect(imported.getByText('Current title: Current name')).toBeTruthy();expect(imported.getByText(/actual balance change unverified/)).toBeTruthy();
    expect(imported.getByText(/original actor, point effects and timezone/)).toBeTruthy();expect(imported.queryByRole('button', { name: /Undo/ })).toBeNull();
    expect(imported.queryByText(/Your partner recorded/)).toBeNull();expect(imported.queryByText(/Sub balance:/)).toBeNull();
  });
});
