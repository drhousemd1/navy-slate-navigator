import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RewardFeedback } from '@/components/rewards/RewardFeedback';
const mocks = vi.hoisted(() => ({ actions: null as any, ack: vi.fn() }));
vi.mock('@/contexts/ActionCommandsContext', () => ({ useActionCommands: () => mocks.actions }));
vi.mock('@/hooks/useNotificationSettings', () => ({ useNotificationSettings: () => ({ accountId: 'A', isReady: true, preferences: { enabled: true, types: { rewardRefunded: true } } }) }));
vi.mock('@/data/rewards/actionReadModel', () => ({ acknowledgeRewardFeedback: (...args: any[]) => mocks.ack(...args) }));
vi.mock('@/components/activity/ConfirmedActionFeedback', () => ({ ConfirmedActionFeedback: ({ onDismiss }: any) => <button onClick={onDismiss}>Dismiss refund</button> }));
const scope = { backendId: 'https://fixture.invalid', accountId: 'A', participantId: 'P', relationshipId: 'period', relationshipSessionId: 'session-1' };
beforeEach(() => {
  mocks.actions = { scope, mode: 'atomic', confirmed: [], refresh: vi.fn(), data: { acknowledged: [], events: [{ id: 'event', recorded_at: '2026-01-01' }],
    deliveries: [{ event_id: 'event', kind: 'points_refunded', payload: { kind: 'points_refunded', eventId: 'event', recipientParticipantId: 'P', currency: 'sub', balanceAfter: 10 } }] } };
  mocks.ack.mockReset();
});
afterEach(cleanup);
describe('refund acknowledgement generation', () => {
  it('hides an earlier session failure after Continue', async () => {
    mocks.ack.mockRejectedValue(new Error('Old dismissal failed'));
    const view = render(<RewardFeedback />);
    await act(async () => fireEvent.click(screen.getByText('Dismiss refund')));
    expect(screen.getByRole('alert').textContent).toContain('Old dismissal failed');
    mocks.actions = { ...mocks.actions, scope: { ...scope, relationshipSessionId: 'session-2' } }; view.rerender(<RewardFeedback />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it.each(['reject', 'resolve'] as const)('ignores late %s from an old session and never refreshes the new one', async outcome => {
    let resolve!: () => void, reject!: (error: Error) => void;
    mocks.ack.mockReturnValue(new Promise<void>((yes, no) => { resolve = yes; reject = no; }));
    const view = render(<RewardFeedback />); fireEvent.click(screen.getByText('Dismiss refund'));
    mocks.actions = { ...mocks.actions, scope: { ...scope, relationshipSessionId: 'session-2' } }; view.rerender(<RewardFeedback />);
    await act(async () => { if (outcome === 'reject') reject(new Error('Old failure')); else resolve(); });
    expect(screen.queryByRole('alert')).toBeNull(); expect(mocks.actions.refresh).not.toHaveBeenCalled();
    expect(mocks.ack).toHaveBeenCalledWith(scope, 'event');
  });
});
