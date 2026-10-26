import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskFeedback } from '@/components/task/TaskFeedback';
import { RewardFeedback } from '@/components/rewards/RewardFeedback';
const mocks = vi.hoisted(() => ({ actions: null as any, settings: null as any, data: null as any, ack: vi.fn() }));
vi.mock('@/contexts/ActionCommandsContext', () => ({ useActionCommands: () => mocks.actions }));
vi.mock('@/hooks/useNotificationSettings', () => ({ useNotificationSettings: () => mocks.settings }));
vi.mock('@/data/tasks/actionReadModel', () => ({ useTaskActionData: () => ({ data: mocks.data }) }));
vi.mock('@/data/rewards/actionReadModel', () => ({ acknowledgeRewardFeedback: (...args: any[]) => mocks.ack(...args) }));
beforeEach(() => {
  const scope = { accountId: 'sub', participantId: 'sub-member', relationshipId: 'period' };
  mocks.actions = { scope, mode: 'atomic', confirmed: [], refresh: vi.fn().mockResolvedValue(undefined), data: { events: [], acknowledged: [], deliveries: [{ event_id: 'event', kind: 'action_confirmed', recipient_participant_id: 'sub-member' }] } };
  mocks.data = { events: [{ id: 'event', kind: 'task_completed', subject: { title: 'Morning task' } }], points: [{ event_id: 'event', currency: 'sub', amount: 5 }] };
  mocks.settings = { accountId: 'sub', isReady: true, preferences: { enabled: true, types: { taskCompleted: true, rewardRedeemed: true, rewardRefunded: true } } };
  mocks.ack.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);
describe('confirmed task feedback', () => {
  it('waits for current recipient settings and resumes after temporary unreadiness without acknowledging', () => {
    mocks.settings.isReady = false; const view = render(<TaskFeedback />); expect(screen.queryByRole('status')).toBeNull();
    mocks.settings.isReady = true; view.rerender(<TaskFeedback />); expect(screen.getByText('Sub balance: +5 points')).toBeTruthy();
    mocks.settings.isReady = false; view.rerender(<TaskFeedback />); expect(screen.queryByRole('status')).toBeNull();
    mocks.settings.isReady = true; view.rerender(<TaskFeedback />); expect(screen.getAllByRole('status')).toHaveLength(1); expect(mocks.ack).not.toHaveBeenCalled();
    mocks.settings.accountId = 'dom'; view.rerender(<TaskFeedback />); expect(screen.queryByRole('status')).toBeNull();
  });
  it('durably acknowledges own explicit dismissal, with visible retry after uncertainty', async () => {
    mocks.ack.mockRejectedValueOnce(new Error('Dismissal was not confirmed.'));
    render(<TaskFeedback />); const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: 'Dismiss task confirmation' }));
    expect((await screen.findByRole('alert')).textContent).toContain('not confirmed'); expect(screen.getByText('Task completion confirmed')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retry dismissal' }));
    expect(mocks.ack).toHaveBeenLastCalledWith(mocks.actions.scope, 'event', 'action_confirmed'); expect(screen.queryByRole('status')).toBeNull();
  });
  it('shows a truthful actor acknowledgment for partner points and never labels it reward activity', () => {
    mocks.actions.scope = { ...mocks.actions.scope, accountId: 'dom', participantId: 'dom-member' }; mocks.settings.accountId = 'dom'; mocks.actions.data.deliveries = [];
    mocks.actions.confirmed = [{ command: { commandId: 'command', kind: 'task_complete', taskId: 'task' }, state: { status: 'confirmed', receipt: { pointDeltas: [{ participantId: 'sub-member', currency: 'sub', amount: 5 }], feedback: [{ kind: 'action_confirmed', eventId: 'event', recipientParticipantId: 'sub-member', subjectTitle: 'Morning task' }] } } }];
    render(<><TaskFeedback /><RewardFeedback /></>);
    expect(screen.getByText('Sub balance: +5 points for your partner')).toBeTruthy(); expect(screen.getAllByRole('status')).toHaveLength(1); expect(mocks.ack).not.toHaveBeenCalled();
  });
  it('suppresses task delivery when disabled and never presents a pending command as confirmed', () => {
    mocks.settings.preferences.types.taskCompleted = false; const view = render(<TaskFeedback />); expect(screen.queryByRole('status')).toBeNull();
    mocks.settings.preferences.types.taskCompleted = true; mocks.actions.data.deliveries = []; mocks.actions.confirmed = [{ command: { kind: 'task_complete' }, state: { status: 'pending' } }];
    view.rerender(<TaskFeedback />); expect(screen.queryByRole('status')).toBeNull();
  });
});
