import type {
  ActionEvent, ActionIdentity, ConfigurableOperation, Currency, FixedOperation,
  InventoryLot, Operation, PointDelta, RefundTotal, Role, WalletBalance,
} from './types';

export class ActionContractError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly dependencyEventId: string | null = null,
  ) {
    super(message);
    this.name = 'ActionContractError';
  }
}

function fail(code: string, message: string, dependencyEventId: string | null = null): never {
  throw new ActionContractError(code, message, dependencyEventId);
}

function integer(value: number, nonnegative = false): number {
  if (!Number.isSafeInteger(value) || (nonnegative && value < 0)) {
    fail('invalid_amount', 'Points and quantities must be valid whole numbers.');
  }
  return value;
}

const fixedRoles: Readonly<Record<FixedOperation, Role>> = {
  sub_reward_buy: 'sub', sub_reward_buy_undo: 'sub',
  dom_reward_buy: 'dom', dom_reward_buy_undo: 'dom',
  dom_reward_redeem: 'dom', dom_reward_redeem_undo: 'dom', reward_gift: 'dom',
};

export function assertOperationAllowed(identity: ActionIdentity, expectedRelationshipId: string, operation: Operation): void {
  if (!identity.accountingEnabled) fail('accounting_not_enabled', 'Reward accounting is not ready for this action.');
  if (!expectedRelationshipId || identity.relationshipId !== expectedRelationshipId) {
    fail('stale_relationship', 'This action belongs to a different relationship period.');
  }
  if (!identity.actorParticipantId || identity.participants[identity.actorRole] !== identity.actorParticipantId) {
    fail('invalid_actor', 'The current participant could not be verified.');
  }
  const fixedRole = fixedRoles[operation as FixedOperation];
  if (fixedRole) {
    if (identity.actorRole !== fixedRole) fail('not_allowed', 'This action belongs to the reward owner.');
    return;
  }
  const permission = identity.permissions[operation as ConfigurableOperation];
  if (permission !== 'both' && permission !== identity.actorRole) {
    fail('not_allowed', 'Your relationship settings do not allow this action.');
  }
}

function participant(identity: ActionIdentity, role: Role): string {
  const id = identity.participants[role];
  if (!id) fail('missing_participant', 'The affected participant could not be verified.');
  return id;
}

/** Trusted server values only; task beneficiary follows the definition, never the clicking actor. */
export function planTaskCompletion(identity: ActionIdentity, relationshipId: string, taskRole: Role, points: number): PointDelta {
  assertOperationAllowed(identity, relationshipId, 'task_complete');
  return { participantId: participant(identity, taskRole), currency: taskRole, amount: integer(points, true) };
}

export function planPurchase(identity: ActionIdentity, relationshipId: string, rewardRole: Role, cost: number, balance: number): PointDelta {
  assertOperationAllowed(identity, relationshipId, `${rewardRole}_reward_buy`);
  integer(cost, true);
  integer(balance);
  if (balance < cost) fail('insufficient_points', 'Not enough points to purchase this reward.');
  return { participantId: participant(identity, rewardRole), currency: rewardRole, amount: cost === 0 ? 0 : -cost };
}

/** Preserve the existing zero-floor punishment debit, including an already-negative correction balance. */
export function planPunishment(
  identity: ActionIdentity, relationshipId: string, subBalance: number, deduction: number, domAward: number,
): readonly PointDelta[] {
  assertOperationAllowed(identity, relationshipId, 'punishment_apply');
  integer(subBalance);
  integer(deduction, true);
  integer(domAward, true);
  const actualDeduction = Math.min(Math.max(subBalance, 0), deduction);
  const deltas: PointDelta[] = [{
    participantId: participant(identity, 'sub'), currency: 'sub', amount: actualDeduction === 0 ? 0 : -actualDeduction,
  }];
  // Existing solo-Sub behavior records the debit without inventing a Dom wallet.
  if (domAward > 0 && identity.participants.dom) {
    deltas.push({ participantId: identity.participants.dom, currency: 'dom', amount: domAward });
  }
  return deltas;
}

const recordedUndoOperations: Partial<Record<ActionEvent['kind'], ConfigurableOperation>> = {
  task_completed: 'task_undo', rule_violated: 'rule_violation_undo', punishment_applied: 'punishment_undo',
};

/** No age cap. The server enforces the unique reversal constraint and derives period counts from active events. */
export function planRecordedUndo(identity: ActionIdentity, event: ActionEvent, alreadyReversed: boolean): readonly PointDelta[] {
  const operation = recordedUndoOperations[event.kind];
  if (!operation || event.provenance !== 'command') fail('not_reversible', 'This history entry cannot be undone.');
  assertOperationAllowed(identity, event.relationshipId, operation);
  if (alreadyReversed) fail('already_undone', 'This action has already been undone.');
  return event.points.map(delta => {
    if (participant(identity, delta.currency) !== delta.participantId) fail('invalid_beneficiary', 'The affected balance could not be verified.');
    integer(delta.amount);
    return { ...delta, amount: delta.amount === 0 ? 0 : -delta.amount };
  });
}

function assertLot(identity: ActionIdentity, lot: InventoryLot): void {
  if (identity.relationshipId !== lot.relationshipId) fail('stale_relationship', 'This reward belongs to a different relationship period.');
  if (participant(identity, lot.currency) !== lot.ownerParticipantId) fail('invalid_beneficiary', 'The reward owner could not be verified.');
  if ((lot.status === 'redeemed') !== (lot.activeRedemptionEventId !== null)) fail('invalid_lot', 'The reward use could not be verified.');
}

function refundValue(lot: InventoryLot): RefundTotal {
  let paidPoints = 0;
  let migrationCredit = 0;
  if (lot.price.kind === 'paid') paidPoints = integer(lot.price.paidPrice, true);
  else if (lot.price.kind === 'gift') {
    if (lot.price.paidPrice !== 0) fail('invalid_amount', 'A gift cannot have a paid price.');
  }
  else {
    const valuation = lot.price.migrationCredit;
    if (!valuation || !valuation.valuationId || valuation.basis !== 'cutover_catalog_cost') {
      fail('missing_legacy_valuation', 'This restored reward needs its migration value before a refund can be calculated.');
    }
    migrationCredit = integer(valuation.amount, true);
  }
  return { participantId: lot.ownerParticipantId, currency: lot.currency, paidPoints, migrationCredit, total: integer(paidPoints + migrationCredit) };
}

export function planPurchaseUndo(identity: ActionIdentity, lot: InventoryLot, purchaseEventId: string): RefundTotal {
  assertLot(identity, lot);
  assertOperationAllowed(identity, lot.relationshipId, `${lot.currency}_reward_buy_undo`);
  if (lot.price.kind !== 'paid' || lot.acquisitionEventId !== purchaseEventId) fail('not_reversible', 'This entry is not the original purchase.');
  if (lot.status === 'redeemed') fail('undo_use_first', 'Undo this reward use before undoing its purchase.', lot.activeRedemptionEventId);
  if (lot.status !== 'available') fail('already_cancelled', 'This purchase has already been cancelled or refunded.');
  return refundValue(lot);
}

export function planRedemptionUndo(identity: ActionIdentity, lot: InventoryLot, redemptionEventId: string, rewardDeleted: boolean): {
  readonly nextStatus: 'available' | 'cancelled';
  readonly refund: RefundTotal | null;
} {
  assertLot(identity, lot);
  assertOperationAllowed(identity, lot.relationshipId, `${lot.currency}_reward_redeem_undo`);
  if (lot.status !== 'redeemed' || lot.activeRedemptionEventId !== redemptionEventId) {
    fail('not_active_use', 'This reward use is no longer active.');
  }
  // A deleted catalog item cannot leave newly restored, unusable inventory behind.
  return rewardDeleted ? { nextStatus: 'cancelled', refund: refundValue(lot) } : { nextStatus: 'available', refund: null };
}

/** Atomic deletion must persist these cancellations and credits together with the soft-deleted definition. */
export function planRewardDeletion(identity: ActionIdentity, relationshipId: string, rewardId: string, lots: readonly InventoryLot[]): {
  readonly cancelLotIds: readonly string[];
  readonly refunds: readonly RefundTotal[];
} {
  assertOperationAllowed(identity, relationshipId, 'definition_manage');
  const seen = new Set<string>();
  const totals = new Map<string, RefundTotal>();
  const cancelLotIds: string[] = [];
  for (const lot of lots) {
    assertLot(identity, lot);
    if (lot.rewardId !== rewardId || seen.has(lot.id)) fail('invalid_lot', 'The reward inventory could not be verified.');
    seen.add(lot.id);
    if (lot.status !== 'available') continue;
    cancelLotIds.push(lot.id);
    const refund = refundValue(lot);
    const key = walletKey(refund.participantId, refund.currency);
    const previous = totals.get(key);
    totals.set(key, previous ? {
      ...refund,
      paidPoints: integer(previous.paidPoints + refund.paidPoints),
      migrationCredit: integer(previous.migrationCredit + refund.migrationCredit),
      total: integer(previous.total + refund.total),
    } : refund);
  }
  return { cancelLotIds, refunds: [...totals.values()] };
}

function walletKey(participantId: string, currency: Currency): string {
  return JSON.stringify([participantId, currency]);
}

/** Corrections may make a balance negative. Spending validation belongs to planPurchase. */
export function applyPointDeltas(balances: readonly WalletBalance[], deltas: readonly PointDelta[]): readonly WalletBalance[] {
  const wallets = new Map<string, WalletBalance>();
  for (const wallet of balances) {
    const key = walletKey(wallet.participantId, wallet.currency);
    if (wallets.has(key)) fail('duplicate_wallet', 'The balance could not be verified.');
    wallets.set(key, { ...wallet, balance: integer(wallet.balance) });
  }
  for (const delta of deltas) {
    const key = walletKey(delta.participantId, delta.currency);
    const wallet = wallets.get(key);
    if (!wallet) fail('missing_wallet', 'The affected balance could not be verified.');
    wallets.set(key, { ...wallet, balance: integer(wallet.balance + integer(delta.amount)) });
  }
  return [...wallets.values()];
}

/** A Dom gift creates one free Sub-owned unit; it never charges either wallet. */
export function planGift(identity: ActionIdentity, relationshipId: string, rewardRole: Role): {
  readonly ownerParticipantId: string; readonly currency: 'sub'; readonly paidPrice: 0;
} {
  assertOperationAllowed(identity, relationshipId, 'reward_gift');
  if (rewardRole !== 'sub') fail('sub_reward_gift_required', 'Choose a Sub reward to give as a gift.');
  return { ownerParticipantId: participant(identity, 'sub'), currency: 'sub', paidPrice: 0 };
}

/** The caller selects inventory, never an arbitrary beneficiary. Type edits do not retag lots. */
export function selectRewardLot(
  identity: ActionIdentity, relationshipId: string, rewardId: string, currentRole: Role,
  lots: readonly InventoryLot[], selectedCurrency?: Currency,
): InventoryLot {
  const available = lots.filter(lot => lot.rewardId === rewardId && lot.status === 'available');
  for (const lot of available) assertLot(identity, lot);
  if (!selectedCurrency && new Set(available.map(lot => lot.currency)).size > 1) {
    fail('inventory_selection_required', 'Choose which reward inventory to use.');
  }
  const currency = selectedCurrency ?? currentRole;
  assertOperationAllowed(identity, relationshipId, `${currency}_reward_redeem`);
  const matches = available.filter(lot => lot.currency === currency);
  if (matches.some(lot => !Number.isFinite(Date.parse(lot.createdAt)))) fail('invalid_lot', 'The reward inventory could not be verified.');
  matches.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
  if (!matches[0]) fail('no_available_reward', 'No available reward in the selected inventory.');
  return matches[0];
}

/** Daily/weekly targets use the selected period; one-time capacity uses retained lifetime completions. */
export function assertTaskCapacity(frequency: 'once' | 'daily' | 'weekly', target: number, currentCount: number): void {
  if (!['once', 'daily', 'weekly'].includes(frequency) || (frequency === 'once' && target !== 1)) fail('invalid_task_definition', 'Choose one completion for a one-time task, or a daily or weekly target.');
  integer(target, true);
  integer(currentCount, true);
  if (target < 1) fail('invalid_task_definition', 'Tasks must allow at least one completion per period.');
  if (currentCount >= target) fail('task_target_reached', 'This task has reached its target for this period.');
}
