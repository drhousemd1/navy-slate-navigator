import { z } from 'zod';
import type { ActionCommand, ActionReceipt, PendingActionState } from '@/domain/actions/types';

export type RewardCommand = Extract<ActionCommand, { kind: 'reward_buy' | 'reward_redeem' | 'reward_delete' | 'reward_gift' | 'undo' }>;
type Intent<T> = T extends unknown ? Omit<T, 'commandId' | 'expectedRelationshipId'> : never;
export type RewardIntent = Intent<RewardCommand>;
export interface ActionQueueScope {
  readonly backendId: string;
  readonly accountId: string;
  readonly participantId: string;
  readonly relationshipId: string;
}
export interface ActionProblem {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly dependencyEventId?: string;
  readonly sqlState?: string;
  readonly expectedCost?: number;
  readonly currentCost?: number;
}
export type CommandOutcome =
  | { kind: 'confirmed'; receipt: ActionReceipt }
  | { kind: 'rejected' | 'confirmation_unknown' | 'not_sent'; problem: ActionProblem };
export interface RewardTransport {
  readonly backendId: string;
  execute(command: RewardCommand, scope: ActionQueueScope, signal: AbortSignal): Promise<CommandOutcome>;
}

const id = z.string().uuid();
const currency = z.enum(['dom', 'sub']);
const integer = z.number().finite().int().safe();
const amount = integer.nonnegative();
const commandBase = { commandId: id, expectedRelationshipId: id };
export const commandSchema = z.discriminatedUnion('kind', [
  z.object({ ...commandBase, kind: z.literal('reward_buy'), rewardId: id, expectedCost: amount.max(2147483647) }).strict(),
  z.object({ ...commandBase, kind: z.literal('reward_delete'), rewardId: id }).strict(),
  z.object({ ...commandBase, kind: z.literal('reward_gift'), rewardId: id }).strict(),
  z.object({ ...commandBase, kind: z.literal('reward_redeem'), rewardId: id, inventoryCurrency: currency.optional() }).strict(),
  z.object({ ...commandBase, kind: z.literal('undo'), eventId: id }).strict(),
]);

export const scopeSchema = z.object({ backendId: z.string().url(), accountId: id, participantId: id, relationshipId: id }).strict();
const feedbackBase = { eventId: id, recipientParticipantId: id, subjectTitle: z.string() };
const receiptSchema = z.object({
  commandId: id, relationshipId: id, eventIds: z.array(id).min(1), confirmedAt: z.string().datetime({ offset: true }),
  balances: z.array(z.object({ participantId: id, currency, balance: integer })),
  inventorySelection: z.object({ requestedCurrency: currency.nullable(), allocatedCurrency: currency }).nullable().optional(),
  availableRewardQuantities: z.array(z.object({ rewardId: id, ownerParticipantId: id, currency, quantity: amount })),
  refunds: z.array(z.object({ participantId: id, currency, paidPoints: amount, migrationCredit: amount, total: amount })),
  feedback: z.array(z.discriminatedUnion('kind', [
    z.object({ ...feedbackBase, kind: z.literal('action_confirmed') }),
    z.object({ ...feedbackBase, kind: z.literal('points_refunded'), reason: z.enum(['reward_deleted', 'purchase_undone', 'redemption_undone_after_deletion']), currency, points: integer.positive(), balanceAfter: integer }),
  ])),
});

export function decodeRewardCommand(value: unknown): RewardCommand {
  return commandSchema.parse(value) as RewardCommand;
}
export function decodeActionScope(value: unknown): ActionQueueScope {
  // Runtime required-field validation remains strict even in this legacy
  // project's non-strict TypeScript configuration.
  return scopeSchema.parse(value) as ActionQueueScope;
}
export function scopeKey(scope: ActionQueueScope): string {
  return JSON.stringify([scope.backendId, scope.accountId, scope.participantId, scope.relationshipId]);
}
export function decodeActionReceipt(value: unknown, command: RewardCommand): ActionReceipt {
  const receipt = receiptSchema.parse(value);
  if (receipt.commandId !== command.commandId || receipt.relationshipId !== command.expectedRelationshipId) throw new Error('Receipt does not match the original command');
  if (new Set(receipt.eventIds).size !== receipt.eventIds.length) throw new Error('Duplicate receipt events');
  const walletKeys = receipt.balances.map(b => JSON.stringify([b.participantId, b.currency]));
  if (new Set(walletKeys).size !== walletKeys.length) throw new Error('Duplicate receipt balances');
  const feedbackKeys = receipt.feedback.map(f => JSON.stringify([f.eventId, f.recipientParticipantId]));
  if (new Set(feedbackKeys).size !== feedbackKeys.length) throw new Error('Duplicate receipt feedback');
  for (const refund of receipt.refunds) if (refund.total !== refund.paidPoints + refund.migrationCredit) throw new Error('Inconsistent receipt refund');
  for (const feedback of receipt.feedback) {
    if (!receipt.eventIds.includes(feedback.eventId)) throw new Error('Feedback is outside the receipt');
    if (feedback.kind === 'points_refunded' && !receipt.balances.some(b => b.participantId === feedback.recipientParticipantId && b.currency === feedback.currency && b.balance === feedback.balanceAfter)) throw new Error('Feedback balance is inconsistent');
  }
  return receipt as ActionReceipt;
}

export interface QueueEntry {
  readonly version: 1;
  readonly sequence: number;
  readonly scope: ActionQueueScope;
  readonly command: RewardCommand;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly state: PendingActionState;
  readonly attempts: number;
  readonly everSent: boolean;
  readonly nextAttemptAt: number;
  readonly problem: ActionProblem | null;
  readonly lease: { readonly token: string; readonly until: number } | null;
}
export type NewQueueEntry = Omit<QueueEntry, 'sequence'>;

/** Reject corrupt records without deleting or attempting them. */
export function decodeQueueEntry(value: unknown): QueueEntry {
  if (!value || typeof value !== 'object') throw new Error('Invalid saved command');
  const entry = value as QueueEntry;
  const command = decodeRewardCommand(entry.command);
  const scope = decodeActionScope(entry.scope);
  if (entry.version !== 1 || command.expectedRelationshipId !== scope.relationshipId || !Number.isSafeInteger(entry.sequence) || entry.sequence < 1 ||
      !Number.isSafeInteger(entry.attempts) || entry.attempts < 0 || typeof entry.everSent !== 'boolean' ||
      ![entry.createdAt, entry.updatedAt, entry.nextAttemptAt].every(Number.isFinite) ||
      !entry.state || !['pending', 'sending', 'confirmation_unknown', 'confirmed', 'rejected'].includes(entry.state.status)) throw new Error('Invalid saved command state');
  if (entry.state.status === 'confirmed') decodeActionReceipt(entry.state.receipt, command);
  else if (JSON.stringify(decodeRewardCommand(entry.state.command)) !== JSON.stringify(command)) throw new Error('Saved command payload changed');
  if (entry.state.status === 'rejected' && typeof entry.state.reason !== 'string') throw new Error('Invalid saved rejection');
  if (entry.lease && (typeof entry.lease.token !== 'string' || !Number.isFinite(entry.lease.until))) throw new Error('Invalid command lease');
  if ((entry.lease !== null && entry.state.status !== 'sending') ||
      (entry.state.status === 'sending' && !entry.lease) ||
      (entry.state.status !== 'pending' && (!entry.everSent || entry.attempts < 1))) throw new Error('Inconsistent saved send state');
  if (entry.problem && (typeof entry.problem.code !== 'string' || typeof entry.problem.message !== 'string' || typeof entry.problem.retryable !== 'boolean')) throw new Error('Invalid saved command error');
  return structuredClone(entry);
}
