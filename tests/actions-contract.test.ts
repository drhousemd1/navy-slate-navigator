import { describe, expect, it } from 'vitest';
import {
  ActionContractError, assertTaskCapacity, applyPointDeltas, assertOperationAllowed, planPurchase, planPurchaseUndo,
  planGift, selectRewardLot, planPunishment, planRecordedUndo, planRedemptionUndo, planRewardDeletion, planTaskCompletion,
} from '../src/domain/actions/accounting';
import type { ActionEvent, ActionIdentity, InventoryLot, Role } from '../src/domain/actions/types';

const context = (role: Role = 'dom'): ActionIdentity => ({
  relationshipId: 'period-a', accountingEnabled: true, actorParticipantId: `${role}-participant`, actorRole: role,
  participants: { dom: 'dom-participant', sub: 'sub-participant' },
  permissions: {
    task_complete: 'both', task_undo: 'both', rule_violation: 'both', rule_violation_undo: 'both',
    punishment_apply: 'both', punishment_undo: 'both', sub_reward_redeem: 'both',
    sub_reward_redeem_undo: 'both', definition_manage: 'both',
  },
});

const lot = (changes: Partial<InventoryLot> = {}): InventoryLot => ({
  id: 'lot-1', relationshipId: 'period-a', rewardId: 'reward-1', ownerParticipantId: 'sub-participant',
  currency: 'sub', acquisitionEventId: 'purchase-1', createdAt: '2026-10-27T00:00:00Z', price: { kind: 'paid', paidPrice: 20 },
  status: 'available', activeRedemptionEventId: null, ...changes,
});

const completed: ActionEvent = {
  id: 'completion-1', commandId: 'command-1', relationshipId: 'period-a', kind: 'task_completed',
  actorParticipantId: 'dom-participant', beneficiaryParticipantId: 'sub-participant', recordedAt: '2020-01-01T00:00:00Z',
  subject: { type: 'task', id: 'task-1', title: 'Synthetic task', role: 'sub' },
  definitionValues: { type: 'task', points: 10, frequency: 'daily', target: 1 },
  calendar: { participantId: 'sub-participant', timeZone: 'America/Boise', localDate: '2019-12-31', weekStartDate: '2019-12-30' },
  points: [{ participantId: 'sub-participant', currency: 'sub', amount: 10 }],
  inventory: [], reversesEventId: null, provenance: 'command',
};

function code(fn: () => unknown, expected: string, dependency: string | null = null) {
  try { fn(); } catch (error) {
    expect(error).toBeInstanceOf(ActionContractError);
    expect((error as ActionContractError).code).toBe(expected);
    expect((error as ActionContractError).dependencyEventId).toBe(dependency);
    return;
  }
  throw new Error(`Expected ${expected}`);
}

describe('verified identity and operation boundaries', () => {
  it.each(['dom', 'sub'] as const)('lets %s record the other role task without taking its points', role => {
    const beneficiary = role === 'dom' ? 'sub' : 'dom';
    expect(planTaskCompletion(context(role), 'period-a', beneficiary, 7)).toEqual({
      participantId: `${beneficiary}-participant`, currency: beneficiary, amount: 7,
    });
  });

  it('rejects a stale period even for the same two participants', () => {
    code(() => planTaskCompletion({ ...context(), relationshipId: 'period-b' }, 'period-a', 'sub', 10), 'stale_relationship');
  });

  it('does not bypass the separate accounting activation gate', () => {
    code(() => planPurchase({ ...context('sub'), accountingEnabled: false }, 'period-a', 'sub', 1, 100), 'accounting_not_enabled');
  });

  it('fails closed for invalid actor, missing beneficiary and current permission changes', () => {
    code(() => planTaskCompletion({ ...context(), actorParticipantId: 'foreign' }, 'period-a', 'sub', 10), 'invalid_actor');
    code(() => planTaskCompletion({ ...context(), participants: { dom: 'dom-participant', sub: null } }, 'period-a', 'sub', 10), 'missing_participant');
    const restricted = { ...context('sub'), permissions: { ...context().permissions, task_undo: 'dom' as const } };
    code(() => planRecordedUndo(restricted, completed, false), 'not_allowed');
  });

  it('never turns shared permissions into cross-currency purchasing or purchase Undo', () => {
    code(() => planPurchase(context(), 'period-a', 'sub', 20, 100), 'not_allowed');
    code(() => planPurchase(context('sub'), 'period-a', 'dom', 20, 100), 'not_allowed');
    code(() => planPurchaseUndo(context(), lot(), 'purchase-1'), 'not_allowed');
  });

  it('allows configured shared Sub redemption, with fixed Dom redemption', () => {
    expect(() => assertOperationAllowed(context(), 'period-a', 'sub_reward_redeem')).not.toThrow();
    expect(() => assertOperationAllowed(context('sub'), 'period-a', 'sub_reward_redeem')).not.toThrow();
    code(() => assertOperationAllowed(context('sub'), 'period-a', 'dom_reward_redeem'), 'not_allowed');
  });
});

describe('exact, reversible accounting', () => {
  it('allows an old completion Undo by either partner without a time cap', () => {
    for (const role of ['dom', 'sub'] as const) {
      expect(planRecordedUndo(context(role), completed, false)).toEqual([{ participantId: 'sub-participant', currency: 'sub', amount: -10 }]);
    }
  });

  it('keeps correction history meaningful after earned points were spent', () => {
    const corrected = applyPointDeltas([{ participantId: 'sub-participant', currency: 'sub', balance: 2 }], planRecordedUndo(context(), completed, false));
    expect(corrected[0].balance).toBe(-8);
    code(() => planPurchase(context('sub'), 'period-a', 'sub', 1, corrected[0].balance), 'insufficient_points');
  });

  it('does not award the configured punishment deduction back when only part was actually deducted', () => {
    const actual = planPunishment(context(), 'period-a', 3, 10, 4);
    expect(actual).toEqual([
      { participantId: 'sub-participant', currency: 'sub', amount: -3 },
      { participantId: 'dom-participant', currency: 'dom', amount: 4 },
    ]);
    const reverse = planRecordedUndo(context('sub'), { ...completed, kind: 'punishment_applied', points: actual }, false);
    expect(reverse.map(x => x.amount)).toEqual([3, -4]);
    expect(planPunishment(context(), 'period-a', -8, 10, 4)[0].amount).toBe(0);
  });

  it('rejects duplicate reversal, reversal of reversal, and fabricated legacy reversal values', () => {
    code(() => planRecordedUndo(context(), completed, true), 'already_undone');
    code(() => planRecordedUndo(context(), { ...completed, kind: 'action_undone' }, false), 'not_reversible');
    code(() => planRecordedUndo(context(), { ...completed, provenance: 'legacy_import' }, false), 'not_reversible');
  });

  it('preserves zero prices and rejects invalid amounts', () => {
    expect(planPurchase(context('sub'), 'period-a', 'sub', 0, 0).amount).toBe(0);
    for (const cost of [-1, 1.5, NaN, Infinity]) code(() => planPurchase(context('sub'), 'period-a', 'sub', cost, 100), 'invalid_amount');
    code(() => applyPointDeltas([{ participantId: 'sub-participant', currency: 'sub', balance: Number.MAX_SAFE_INTEGER }], completed.points), 'invalid_amount');
  });

  it('keeps rule Undo history even without a points change', () => {
    expect(planRecordedUndo(context('sub'), { ...completed, kind: 'rule_violated', points: [] }, false)).toEqual([]);
  });
});

describe('purchase, redemption and deletion dependencies', () => {
  it('refunds the receipt value without reading the subsequently edited catalog price', () => {
    expect(planPurchaseUndo(context('sub'), lot(), 'purchase-1').total).toBe(20);
  });

  it('gives an actionable Undo Use dependency before purchase refund', () => {
    code(() => planPurchaseUndo(context('sub'), lot({ status: 'redeemed', activeRedemptionEventId: 'use-1' }), 'purchase-1'), 'undo_use_first', 'use-1');
    code(() => planPurchaseUndo(context('sub'), lot({ status: 'cancelled' }), 'purchase-1'), 'already_cancelled');
  });

  it('restores the exact used lot and rejects an old redemption after a later use', () => {
    const used = lot({ status: 'redeemed', activeRedemptionEventId: 'use-2' });
    code(() => planRedemptionUndo(context(), used, 'use-1', false), 'not_active_use');
    expect(planRedemptionUndo(context(), used, 'use-2', false)).toEqual({ nextStatus: 'available', refund: null });
  });

  it('refunds an undone use after catalog deletion instead of restoring unusable supply', () => {
    const result = planRedemptionUndo(context(), lot({ status: 'redeemed', activeRedemptionEventId: 'use-1' }), 'use-1', true);
    expect(result.nextStatus).toBe('cancelled');
    expect(result.refund?.total).toBe(20);
  });

  it('deletes unused units only, preserving paid versus migration credit and each currency owner', () => {
    const lots = [
      lot(), lot({ id: 'gift', price: { kind: 'gift', paidPrice: 0 } }),
      lot({ id: 'legacy', price: { kind: 'legacy', paidPrice: null, migrationCredit: { amount: 6, valuationId: 'cutover-1', basis: 'cutover_catalog_cost' } } }),
      lot({ id: 'dom-lot', currency: 'dom', ownerParticipantId: 'dom-participant', price: { kind: 'paid', paidPrice: 9 } }),
      lot({ id: 'used', status: 'redeemed', activeRedemptionEventId: 'use-1' }),
      lot({ id: 'cancelled', status: 'cancelled' }),
    ];
    const result = planRewardDeletion(context(), 'period-a', 'reward-1', lots);
    expect(result.cancelLotIds).toEqual(['lot-1', 'gift', 'legacy', 'dom-lot']);
    expect(result.refunds).toEqual([
      { participantId: 'sub-participant', currency: 'sub', paidPoints: 20, migrationCredit: 6, total: 26 },
      { participantId: 'dom-participant', currency: 'dom', paidPoints: 9, migrationCredit: 0, total: 9 },
    ]);
    expect(lots[0].status).toBe('available'); // A plan does not mutate server state.
  });

  it('fails the entire plan rather than silently pricing unknown legacy inventory at zero/current cost', () => {
    code(() => planRewardDeletion(context(), 'period-a', 'reward-1', [lot(), lot({ id: 'unknown', price: { kind: 'legacy', paidPrice: null, migrationCredit: null } })]), 'missing_legacy_valuation');
  });

  it('rejects duplicate inventory and another period/participant before returning a refund plan', () => {
    code(() => planRewardDeletion(context(), 'period-a', 'reward-1', [lot(), lot()]), 'invalid_lot');
    code(() => planRewardDeletion(context(), 'period-a', 'reward-1', [lot({ relationshipId: 'period-old' })]), 'stale_relationship');
    code(() => planRewardDeletion(context(), 'period-a', 'reward-1', [lot({ ownerParticipantId: 'unrelated' })]), 'invalid_beneficiary');
  });
});


describe('gift and explicit inventory intent', () => {
  it('gives a free Sub unit only through the fixed Dom gift operation', () => {
    expect(planGift(context(), 'period-a', 'sub')).toEqual({ ownerParticipantId: 'sub-participant', currency: 'sub', paidPrice: 0 });
    code(() => planGift(context('sub'), 'period-a', 'sub'), 'not_allowed');
    code(() => planGift(context(), 'period-a', 'dom'), 'sub_reward_gift_required');
    code(() => planGift({ ...context(), participants: { dom: 'dom-participant', sub: null } }, 'period-a', 'sub'), 'missing_participant');
  });

  it('requires selection for mixed inventory and preserves the selected owner after type edits', () => {
    const sub = lot();
    const dom = lot({ id: 'lot-dom', ownerParticipantId: 'dom-participant', currency: 'dom' });
    code(() => selectRewardLot(context(), 'period-a', 'reward-1', 'dom', [sub, dom]), 'inventory_selection_required');
    expect(selectRewardLot(context(), 'period-a', 'reward-1', 'dom', [sub, dom], 'sub')).toBe(sub);
    expect(selectRewardLot(context(), 'period-a', 'reward-1', 'sub', [sub, dom], 'dom')).toBe(dom);
    code(() => selectRewardLot(context('sub'), 'period-a', 'reward-1', 'sub', [sub, dom], 'dom'), 'not_allowed');
  });

  it('allocates deterministically within selected currency and never silently switches owners', () => {
    const newer = lot({ id: 'z', createdAt: '2026-10-28T00:00:00Z' });
    const older = lot({ id: 'b' });
    const tie = lot({ id: 'a' });
    expect(selectRewardLot(context(), 'period-a', 'reward-1', 'sub', [newer, older, tie], 'sub')).toBe(tie);
    code(() => selectRewardLot(context(), 'period-a', 'reward-1', 'dom', [older]), 'no_available_reward');
    code(() => selectRewardLot({ ...context(), permissions: { ...context().permissions, sub_reward_redeem: 'sub' } }, 'period-a', 'reward-1', 'sub', [older]), 'not_allowed');
  });
});


describe('task calendar-period capacity', () => {
  it.each(['daily', 'weekly'] as const)('caps the %s period total without changing the per-completion award', frequency => {
    expect(() => assertTaskCapacity(frequency, 3, 2)).not.toThrow();
    code(() => assertTaskCapacity(frequency, 3, 3), 'task_target_reached');
    code(() => assertTaskCapacity(frequency, 2, 3), 'task_target_reached');
    expect(() => assertTaskCapacity(frequency, 4, 3)).not.toThrow();
    expect(planTaskCompletion(context(), 'period-a', 'sub', 0).amount).toBe(0);
  });
  it('rejects invalid targets and counts', () => {
    code(() => assertTaskCapacity('daily', 0, 0), 'invalid_task_definition');
    code(() => assertTaskCapacity('weekly', 2.5, 1), 'invalid_amount');
    code(() => assertTaskCapacity('weekly', 2, -1), 'invalid_amount');
  });
});
