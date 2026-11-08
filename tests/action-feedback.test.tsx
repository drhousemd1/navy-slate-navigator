import React, { StrictMode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionReceipt, PendingActionState } from '@/domain/actions/types';
import { ConfirmedActionFeedback } from '@/components/activity/ConfirmedActionFeedback';
import { createActionFeedbackLedger, type FeedbackScope, type ScopedActionFeedback } from '@/lib/action-feedback';
import { readFileSync } from 'node:fs';
import { COLOR_SCHEMES, getColorScheme } from '@/lib/colorSchemes';
const feedbackCss = readFileSync('src/components/activity/action-feedback.css', 'utf8');

const sub: FeedbackScope = { accountId: 'sub-account', participantId: 'sub-participant', relationshipId: 'period-1' };
const dom: FeedbackScope = { accountId: 'dom-account', participantId: 'dom-participant', relationshipId: 'period-1' };
const command = { commandId: 'command-1', expectedRelationshipId: 'period-1', kind: 'reward_delete' as const, rewardId: 'reward-1' };
const receipt = (overrides: Partial<ActionReceipt> = {}): ActionReceipt => ({
  commandId: 'command-1', relationshipId: 'period-1', eventIds: ['event-1'], confirmedAt: '2026-10-26T12:00:00Z',
  balances: [{ participantId: sub.participantId, currency: 'sub', balance: 52 }], availableRewardQuantities: [],
  refunds: [{ participantId: sub.participantId, currency: 'sub', paidPoints: 20, migrationCredit: 0, total: 20 }],
  feedback: [{ eventId: 'event-1', recipientParticipantId: sub.participantId, subjectTitle: 'Quiet evening together',
    kind: 'points_refunded', reason: 'reward_deleted', currency: 'sub', points: 20, balanceAfter: 52 }], ...overrides,
});
const result = (value = receipt(), scope = sub): ScopedActionFeedback => ({ scope, state: { status: 'confirmed', receipt: value }, audience: { kind: 'recipient' } });
let reduceMotion = false;
let motionChanged: (() => void) | undefined;

beforeEach(() => {
  reduceMotion = false;
  motionChanged = undefined;
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    get matches() { return reduceMotion; },
    addEventListener: (_: string, callback: () => void) => { motionChanged = callback; },
    removeEventListener: vi.fn(),
  })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('confirmed refund feedback', () => {
  it.each(COLOR_SCHEMES.map(s => s.name))('uses the restored refund palette without theme text substitution in the %s card', theme => {
    // jsdom does not resolve custom properties. Substitute the real palette
    // values into the real stylesheet, then check its rendered selector cascade.
    const style = document.createElement('style'), palette = getColorScheme(theme)!.variables;
    style.textContent = feedbackCss.replace(/var\((--[a-z-]+)\)/g, (match, key) => palette[key as keyof typeof palette] ?? match);
    document.head.append(style);
    try {
      const view = render(<ConfirmedActionFeedback activeScope={sub} result={result()} enabled ledger={createActionFeedbackLedger()} />);
      const card = screen.getByRole('article');
      for (const [selector, color] of [
        ['.action-feedback-eyebrow', 'rgb(253, 230, 138)'], ['.action-feedback-amount', 'rgb(253, 230, 138)'],
        ['.action-feedback-amount span', 'rgb(255, 255, 255)'], ['.action-feedback-recipient', 'rgb(165, 243, 252)'],
        ['.action-feedback-reward', 'rgb(255, 255, 255)'], ['.action-feedback-reason', 'rgb(203, 213, 225)'],
        ['.action-feedback-balance', 'rgb(203, 213, 225)'], ['.action-feedback-balance strong', 'rgb(255, 255, 255)'],
        ['.action-feedback-dismiss', 'rgb(203, 213, 225)'],
      ]) expect(getComputedStyle(card.querySelector(selector)!).color).toBe(color);
      expect(view.container.querySelectorAll('.action-feedback-coin')).toHaveLength(8);
      expect(getComputedStyle(view.container.querySelector('.action-feedback-coin')!).borderTopColor).toBe('rgb(251, 191, 36)');
    } finally { style.remove(); }
  });

  it.each(['pending', 'sending', 'confirmation_unknown', 'rejected'] as const)('does not announce or animate a %s command', status => {
    const state: PendingActionState = status === 'rejected' ? { status, command, reason: 'No permission' } : { status, command };
    const view = render(<ConfirmedActionFeedback activeScope={sub} result={{ scope: sub, state, audience: { kind: 'recipient' } }} enabled ledger={createActionFeedbackLedger()} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(view.container.querySelector('.action-feedback-coins')).toBeNull();
  });

  it('shows the confirmed amount, reward, reason and own balance without calling a refund a redemption', () => {
    const view = render(<ConfirmedActionFeedback activeScope={sub} result={result()} enabled ledger={createActionFeedbackLedger()} />);
    expect(screen.getByRole('heading', { name: '20 Sub points refunded' })).toBeTruthy();
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toContain('Quiet evening together');
    expect(status.textContent).toContain('The reward was deleted. Points for its unused purchases were returned.');
    expect(status.textContent).toContain('Your Sub balance after this refund: 52 points');
    expect(status.textContent).not.toMatch(/redeem|redemption/i);
    expect(view.container.querySelector('.action-feedback-coins')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('names the partner receiving the refund in the deleting actor’s acknowledgement', () => {
    const ack: ScopedActionFeedback = { ...result(receipt(), dom), audience: {
      kind: 'actor_acknowledgement', recipientParticipantId: sub.participantId, recipientRole: 'sub',
    } };
    render(<ConfirmedActionFeedback activeScope={dom} result={ack} enabled ledger={createActionFeedbackLedger()} />);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Returned to your Sub partner’s balance');
    expect(status.textContent).toContain('Your Sub partner’s balance after this refund: 52 points');
    expect(status.textContent).not.toContain('Returned to your balance');
  });

  it('does not present a partner’s refund as the viewer’s own refund', () => {
    render(<ConfirmedActionFeedback activeScope={dom} result={result(receipt(), dom)} enabled ledger={createActionFeedbackLedger()} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('deduplicates repeated receipts and remains dismissed across retries and remounts', async () => {
    const user = userEvent.setup();
    const ledger = createActionFeedbackLedger();
    const props = { activeScope: sub, result: result(), enabled: true, ledger };
    const view = render(<StrictMode><ConfirmedActionFeedback {...props} /></StrictMode>);
    expect(screen.getAllByRole('article')).toHaveLength(1);
    view.rerender(<StrictMode><ConfirmedActionFeedback {...props} result={result(receipt({ commandId: 'retry-response' }))} /></StrictMode>);
    expect(screen.getAllByRole('article')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Dismiss refund for Quiet evening together' }));
    view.rerender(<ConfirmedActionFeedback {...props} result={result(receipt({ commandId: 'another-retry' }))} />);
    expect(screen.queryByRole('status')).toBeNull();
    view.unmount();
    render(<ConfirmedActionFeedback {...props} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('uses event identity rather than identical amounts or titles to suppress duplicates', async () => {
    const user = userEvent.setup();
    const ledger = createActionFeedbackLedger();
    const view = render(<ConfirmedActionFeedback activeScope={sub} result={result()} enabled ledger={ledger} />);
    await user.click(screen.getByRole('button', { name: /Dismiss refund/ }));
    const next = receipt();
    view.rerender(<ConfirmedActionFeedback activeScope={sub} result={result({ ...next, eventIds: ['event-2'], feedback: next.feedback.map(f => ({ ...f, eventId: 'event-2' })) })} enabled ledger={ledger} />);
    expect(screen.getByRole('heading', { name: '20 Sub points refunded' })).toBeTruthy();
  });

  it('drops the previous account’s feedback immediately and allows the new account’s distinct scoped receipt', () => {
    const ledger = createActionFeedbackLedger();
    const view = render(<ConfirmedActionFeedback activeScope={sub} result={result()} enabled ledger={ledger} />);
    view.rerender(<ConfirmedActionFeedback activeScope={dom} result={result()} enabled ledger={ledger} />);
    expect(screen.queryByRole('status')).toBeNull();
    const domReceipt = receipt({ balances: [{ participantId: dom.participantId, currency: 'dom', balance: 80 }], feedback: [{
      eventId: 'event-1', recipientParticipantId: dom.participantId, subjectTitle: 'Quiet evening together',
      kind: 'points_refunded', reason: 'reward_deleted', currency: 'dom', points: 20, balanceAfter: 80,
    }] });
    view.rerender(<ConfirmedActionFeedback activeScope={dom} result={result(domReceipt, dom)} enabled ledger={ledger} />);
    expect(screen.getByRole('heading', { name: '20 Dom points refunded' })).toBeTruthy();
  });

  it('rejects a stale relationship period and scopes deduplication to the new period', () => {
    const ledger = createActionFeedbackLedger();
    const view = render(<ConfirmedActionFeedback activeScope={sub} result={result()} enabled ledger={ledger} />);
    const nextScope = { ...sub, relationshipId: 'period-2' };
    view.rerender(<ConfirmedActionFeedback activeScope={nextScope} result={result()} enabled ledger={ledger} />);
    expect(screen.queryByRole('status')).toBeNull();
    view.rerender(<ConfirmedActionFeedback activeScope={nextScope} result={result(receipt({ relationshipId: 'period-2' }), nextScope)} enabled ledger={ledger} />);
    expect(screen.getByRole('status')).toBeTruthy();
    view.rerender(<ConfirmedActionFeedback activeScope={sub} result={result()} enabled ledger={ledger} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('respects the caller’s display decision without consuming an undisplayed event', () => {
    const ledger = createActionFeedbackLedger();
    const view = render(<ConfirmedActionFeedback activeScope={sub} result={result()} enabled={false} ledger={ledger} />);
    expect(screen.queryByRole('status')).toBeNull();
    view.rerender(<ConfirmedActionFeedback activeScope={sub} result={result()} enabled ledger={ledger} />);
    expect(screen.getByRole('status')).toBeTruthy();
    view.rerender(<ConfirmedActionFeedback activeScope={sub} result={result()} enabled={false} ledger={ledger} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('resumes an undismissed refund after temporary preference unreadiness without duplicate cards', async () => {
    const ledger = createActionFeedbackLedger();
    const props = { activeScope: sub, result: result(), ledger };
    const view = render(<ConfirmedActionFeedback {...props} enabled />);
    expect(screen.getAllByRole('article')).toHaveLength(1);
    view.rerender(<ConfirmedActionFeedback {...props} enabled={false} />);
    expect(screen.queryByRole('status')).toBeNull();
    view.rerender(<ConfirmedActionFeedback {...props} enabled />);
    expect(screen.getAllByRole('article')).toHaveLength(1);
    await userEvent.setup().click(screen.getByRole('button', { name: /Dismiss refund/ }));
    view.rerender(<ConfirmedActionFeedback {...props} enabled={false} />);
    view.rerender(<ConfirmedActionFeedback {...props} enabled />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('is keyboard dismissible without taking focus and returns focus to the previous control', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const ledger = createActionFeedbackLedger();
    const view = render(<><button>Delete reward</button><ConfirmedActionFeedback activeScope={sub} result={null} enabled ledger={ledger} onDismiss={onDismiss} /></>);
    const trigger = screen.getByRole('button', { name: 'Delete reward' });
    trigger.focus();
    view.rerender(<><button>Delete reward</button><ConfirmedActionFeedback activeScope={sub} result={result()} enabled ledger={ledger} onDismiss={onDismiss} /></>);
    expect(document.activeElement).toBe(trigger);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Dismiss refund/ }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(onDismiss).toHaveBeenCalledExactlyOnceWith({ eventId: 'event-1', recipientParticipantId: sub.participantId });
  });

  it('keeps equivalent readable feedback under reduced motion and responds to preference changes', () => {
    reduceMotion = true;
    const view = render(<ConfirmedActionFeedback activeScope={sub} result={result()} enabled ledger={createActionFeedbackLedger()} />);
    expect(screen.getByRole('article').getAttribute('data-motion')).toBe('reduced');
    expect(view.container.querySelector('.action-feedback-coins')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Your Sub balance after this refund: 52 points');
    act(() => { reduceMotion = false; motionChanged?.(); });
    expect(screen.getByRole('article').getAttribute('data-motion')).toBe('full');
    act(() => { reduceMotion = true; motionChanged?.(); });
    expect(view.container.querySelector('.action-feedback-coins')).toBeNull();
  });

  it('does not invent or round an amount, and permits a confirmed negative resulting balance', () => {
    const value = receipt({ balances: [{ participantId: sub.participantId, currency: 'sub', balance: -3.125 }], feedback: [{
      eventId: 'event-1', recipientParticipantId: sub.participantId, subjectTitle: 'Quiet evening together', kind: 'points_refunded',
      reason: 'purchase_undone', currency: 'sub', points: 0.125, balanceAfter: -3.125,
    }] });
    render(<ConfirmedActionFeedback activeScope={sub} result={result(value)} enabled ledger={createActionFeedbackLedger()} />);
    expect(screen.getByRole('heading', { name: '0.125 Sub points refunded' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('-3.125 points');
    expect(screen.getByRole('status').textContent).toContain('The purchase was undone');
  });

  it('does not claim a refund from a mismatched balance or an event absent from the confirmed receipt', () => {
    const ledger = createActionFeedbackLedger();
    const view = render(<ConfirmedActionFeedback activeScope={sub} result={result(receipt({ balances: [] }))} enabled ledger={ledger} />);
    expect(screen.queryByRole('status')).toBeNull();
    view.rerender(<ConfirmedActionFeedback activeScope={sub} result={result(receipt({ eventIds: [] }))} enabled ledger={ledger} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('leaves zero-credit gift removal to ordinary acknowledgement and never celebrates invalid credits', () => {
    const ledger = createActionFeedbackLedger();
    const generic = receipt({ feedback: [{ kind: 'action_confirmed', eventId: 'event-1', recipientParticipantId: sub.participantId, subjectTitle: 'Gift removed' }] });
    const view = render(<ConfirmedActionFeedback activeScope={sub} result={result(generic)} enabled ledger={ledger} />);
    expect(screen.queryByRole('status')).toBeNull();
    for (const points of [0, -20, NaN, Infinity]) {
      const value = receipt({ feedback: [{ kind: 'points_refunded', eventId: 'event-1', recipientParticipantId: sub.participantId,
        subjectTitle: 'Gift removed', reason: 'reward_deleted', currency: 'sub', points, balanceAfter: 52 }] });
      view.rerender(<ConfirmedActionFeedback activeScope={sub} result={result(value)} enabled ledger={ledger} />);
      expect(screen.queryByRole('status')).toBeNull();
      expect(view.container.querySelector('.action-feedback-coins')).toBeNull();
    }
  });
});
