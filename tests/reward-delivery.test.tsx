import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RewardFeedback } from '@/components/rewards/RewardFeedback';

const mocks = vi.hoisted(() => ({ actions: null as any, prefs: null as any, ack: vi.fn(), sequence: 0 }));
vi.mock('@/contexts/ActionCommandsContext', () => ({ useActionCommands: () => mocks.actions }));
vi.mock('@/hooks/useNotificationSettings', () => ({ useNotificationSettings: () => mocks.prefs }));
vi.mock('@/data/rewards/actionReadModel', () => ({ acknowledgeRewardFeedback: (...args: any[]) => mocks.ack(...args) }));
beforeEach(() => {
  const eventId = `delivery-${++mocks.sequence}`;
  const scope = { accountId: 'sub-account', participantId: 'sub-member', relationshipId: 'period' };
  const payload = { kind: 'points_refunded', eventId, recipientParticipantId: scope.participantId, subjectTitle: 'Quiet evening', reason: 'reward_deleted', currency: 'sub', points: 20, balanceAfter: 100 };
  mocks.actions = { scope, mode: 'atomic', confirmed: [], refresh: vi.fn().mockResolvedValue(undefined), data: {
    events: [{ id: eventId, recorded_at: '2026-10-26T12:00:00Z' }], acknowledged: [],
    deliveries: [{ event_id: eventId, relationship_id: 'period', recipient_participant_id: scope.participantId, kind: 'points_refunded', payload }],
  } };
  mocks.prefs = { accountId: scope.accountId, isReady: true, preferences: { enabled: true, types: { rewardRefunded: true } } };
  mocks.ack.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('mounted recipient refund delivery', () => {
  it('waits for this recipient’s preferences, survives temporary unreadiness, then acknowledges only explicit dismissal', async () => {
    mocks.prefs.isReady = false;
    const view = render(<RewardFeedback />);
    expect(screen.queryByRole('status')).toBeNull(); expect(mocks.ack).not.toHaveBeenCalled();
    mocks.prefs.isReady = true; view.rerender(<RewardFeedback />);
    expect(screen.getByText('Returned to your balance')).toBeTruthy();
    mocks.prefs.isReady = false; view.rerender(<RewardFeedback />);
    expect(screen.queryByRole('status')).toBeNull();
    mocks.prefs.isReady = true; view.rerender(<RewardFeedback />);
    expect(screen.getAllByRole('article')).toHaveLength(1);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dismiss refund for Quiet evening' }));
    expect(mocks.ack).toHaveBeenCalledExactlyOnceWith(mocks.actions.scope, mocks.actions.data.events[0].id);
    expect(mocks.actions.refresh).toHaveBeenCalledOnce();
  });
  it('makes a failed acknowledgment visibly retryable, without repeating the refund operation', async () => {
    mocks.ack.mockRejectedValueOnce(new Error('Dismissal could not be confirmed.'));
    render(<RewardFeedback />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Dismiss refund for Quiet evening' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Dismissal could not be confirmed');
    await user.click(screen.getByRole('button', { name: 'Retry dismissal' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(mocks.ack).toHaveBeenCalledTimes(2);
    expect(mocks.actions.refresh).toHaveBeenCalledOnce();
  });
  it('rejects stale preference ownership and describes the actor’s partner refund truthfully', () => {
    mocks.prefs.accountId = 'other-account';
    const view = render(<RewardFeedback />);
    expect(screen.queryByRole('status')).toBeNull();
    const feedback = mocks.actions.data.deliveries[0].payload;
    mocks.actions.scope = { accountId: 'dom-account', participantId: 'dom-member', relationshipId: 'period' };
    mocks.actions.data.deliveries = [];
    mocks.prefs.accountId = 'dom-account';
    mocks.actions.confirmed = [{ scope: mocks.actions.scope, command: { commandId: 'cmd', kind: 'reward_delete' }, state: { status: 'confirmed', receipt: {
      relationshipId: 'period', commandId: 'cmd', eventIds: [feedback.eventId], confirmedAt: '2026-10-26T12:00:00Z',
      balances: [{ participantId: 'sub-member', currency: 'sub', balance: 100 }], feedback: [feedback],
    } } }];
    view.rerender(<RewardFeedback />);
    expect(screen.getByText('Returned to your Sub partner’s balance')).toBeTruthy();
    expect(screen.queryByText('Returned to your balance')).toBeNull();
    expect(mocks.ack).not.toHaveBeenCalled();
  });
});
