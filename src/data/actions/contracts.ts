import { z } from 'zod';
import type { ActionCommand, ActionReceipt, PendingActionState } from '@/domain/actions/types';

export type RewardCommand = Extract<ActionCommand, { kind: 'reward_buy' | 'reward_redeem' | 'reward_delete' | 'reward_gift' | 'undo' }>;
type Intent<T> = T extends unknown ? Omit<T, 'commandId' | 'expectedRelationshipId'> : never;
export type QueuedActionCommand = ActionCommand;
export type ActionIntent = Intent<QueuedActionCommand>;
/** Compatibility name for existing consumers of the shared action queue. */
export type RewardIntent = ActionIntent;
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
export interface ActionTransport {
  readonly backendId: string;
  execute(command: QueuedActionCommand, scope: ActionQueueScope, signal: AbortSignal): Promise<CommandOutcome>;
}
export type RewardTransport = ActionTransport;

const id = z.string().uuid();
const currency = z.enum(['dom', 'sub']);
const integer = z.number().finite().int().safe();
const amount = integer.nonnegative();
const commandBase = { commandId: id, expectedRelationshipId: id };
export const commandSchema = z.discriminatedUnion('kind', [
  z.object({ ...commandBase, kind: z.literal('task_complete'), taskId: id }).strict(),
  z.object({ ...commandBase, kind: z.literal('rule_violation'), ruleId: id }).strict(),
  z.object({ ...commandBase, kind: z.literal('punishment_apply'), punishmentId: id }).strict(),
  z.object({ ...commandBase, kind: z.literal('reward_buy'), rewardId: id, expectedCost: amount.max(2147483647) }).strict(),
  z.object({ ...commandBase, kind: z.literal('reward_delete'), rewardId: id }).strict(),
  z.object({ ...commandBase, kind: z.literal('reward_gift'), rewardId: id }).strict(),
  z.object({ ...commandBase, kind: z.literal('reward_redeem'), rewardId: id, inventoryCurrency: currency.optional() }).strict(),
  z.object({ ...commandBase, kind: z.literal('undo'), eventId: id }).strict(),
]);

export const scopeSchema = z.object({ backendId: z.string().url(), accountId: id, participantId: id, relationshipId: id }).strict();
const feedbackBase = { eventId: id, recipientParticipantId: id, subjectTitle: z.string() };
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Invalid calendar date');
const progressBase = {
  beneficiaryParticipantId: id, timeZone: z.string().min(1), localDate,
  weekStartDate: localDate, weekIdentifier: z.string().regex(/^\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])$/),
  usageData: z.array(amount).length(7), currentCount: amount, deleted: z.boolean(),
};
const taskProgressSchema = z.object({ ...progressBase, taskId: id, currency,
  frequency: z.enum(['daily', 'weekly']), target: integer.positive(), completed: z.boolean(), lastCompletedDate: localDate.nullable(),
});
const recordingProgressSchema = z.object({ ...progressBase, subjectType: z.enum(['rule', 'punishment']), subjectId: id });
const receiptSchema = z.object({
  commandId: id, relationshipId: id, eventIds: z.array(id).min(1), confirmedAt: z.string().datetime({ offset: true }),
  balances: z.array(z.object({ participantId: id, currency, balance: integer })),
  pointDeltas: z.array(z.object({ participantId: id, currency, amount: integer })).optional(),
  taskProgress: taskProgressSchema.nullable().optional(),
  recordingProgress: recordingProgressSchema.nullable().optional(),
  inventorySelection: z.object({ requestedCurrency: currency.nullable(), allocatedCurrency: currency }).nullable().optional(),
  availableRewardQuantities: z.array(z.object({ rewardId: id, ownerParticipantId: id, currency, quantity: amount })),
  refunds: z.array(z.object({ participantId: id, currency, paidPoints: amount, migrationCredit: amount, total: amount })),
  feedback: z.array(z.discriminatedUnion('kind', [
    z.object({ ...feedbackBase, kind: z.literal('action_confirmed') }),
    z.object({ ...feedbackBase, kind: z.literal('points_refunded'), reason: z.enum(['reward_deleted', 'purchase_undone', 'redemption_undone_after_deletion']), currency, points: integer.positive(), balanceAfter: integer }),
  ])),
});

export function decodeActionCommand(value: unknown): QueuedActionCommand {
  return commandSchema.parse(value) as QueuedActionCommand;
}
/** Legacy reward parameter helper remains deliberately reward-specific. */
export function decodeRewardCommand(value: unknown): RewardCommand {
  const command = decodeActionCommand(value);
  if (command.kind === 'task_complete' || command.kind === 'rule_violation' || command.kind === 'punishment_apply') throw new Error('Expected a reward command');
  return command;
}
export function decodeActionScope(value: unknown): ActionQueueScope {
  // Runtime required-field validation remains strict even in this legacy
  // project's non-strict TypeScript configuration.
  return scopeSchema.parse(value) as ActionQueueScope;
}
export function scopeKey(scope: ActionQueueScope): string {
  return JSON.stringify([scope.backendId, scope.accountId, scope.participantId, scope.relationshipId]);
}
export function decodeActionReceipt(value: unknown, command: QueuedActionCommand): ActionReceipt {
  const receipt = receiptSchema.parse(value);
  if (receipt.commandId !== command.commandId || receipt.relationshipId !== command.expectedRelationshipId) throw new Error('Receipt does not match the original command');
  if (new Set(receipt.eventIds).size !== receipt.eventIds.length) throw new Error('Duplicate receipt events');
  const walletKeys = receipt.balances.map(b => JSON.stringify([b.participantId, b.currency]));
  if (new Set(walletKeys).size !== walletKeys.length) throw new Error('Duplicate receipt balances');
  const deltaKeys = receipt.pointDeltas?.map(delta => JSON.stringify([delta.participantId, delta.currency])) ?? [];
  if (new Set(deltaKeys).size !== deltaKeys.length || deltaKeys.some(key => !walletKeys.includes(key))) throw new Error('Inconsistent point delta wallets');
  if (command.kind === 'task_complete' && (!receipt.taskProgress || receipt.taskProgress.taskId !== command.taskId || !receipt.pointDeltas)) throw new Error('Missing or mismatched task receipt');
  if (command.kind === 'rule_violation' || command.kind === 'punishment_apply') {
    const type = command.kind === 'rule_violation' ? 'rule' : 'punishment';
    const target = command.kind === 'rule_violation' ? command.ruleId : command.punishmentId;
    if (!receipt.recordingProgress || receipt.recordingProgress.subjectType !== type || receipt.recordingProgress.subjectId !== target || !receipt.pointDeltas) throw new Error('Missing or mismatched recording receipt');
  }
  if (receipt.taskProgress && (receipt.recordingProgress || !['task_complete', 'undo'].includes(command.kind))) throw new Error('Unexpected task progress');
  if (receipt.recordingProgress && !['rule_violation', 'punishment_apply', 'undo'].includes(command.kind)) throw new Error('Unexpected recording progress');
  for (const progress of [receipt.taskProgress, receipt.recordingProgress]) if (progress) {
    // Validate the supplied calendar/counts without using the browser's clock or
    // timezone to move a recorded action into a different accounting period.
    const start = new Date(`${progress.weekStartDate}T00:00:00Z`);
    const day = (new Date(`${progress.localDate}T00:00:00Z`).getTime() - start.getTime()) / 86400000;
    if (start.getUTCDay() !== 1 || !Number.isInteger(day) || day < 0 || day > 6) throw new Error('Inconsistent progress week');
    const isoYear = new Date(start.getTime() + 3 * 86400000).getUTCFullYear();
    const jan4 = new Date(`${String(isoYear).padStart(4, '0')}-01-04T00:00:00Z`);
    const firstMonday = jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * 86400000;
    const week = 1 + Math.round((start.getTime() - firstMonday) / (7 * 86400000));
    if (progress.weekIdentifier !== `${String(isoYear).padStart(4, '0')}-W${String(week).padStart(2, '0')}`) throw new Error('Inconsistent ISO week identifier');
    const count = progress === receipt.taskProgress && receipt.taskProgress.frequency === 'daily'
      ? progress.usageData[day] : progress.usageData.reduce((sum, count) => sum + count, 0);
    if (!Number.isSafeInteger(count) || progress.currentCount !== count) throw new Error('Inconsistent progress count');
    if (progress === receipt.taskProgress && receipt.taskProgress.completed !== (count >= receipt.taskProgress.target)) throw new Error('Inconsistent task completion');
  }
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
  readonly command: QueuedActionCommand;
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
  const command = decodeActionCommand(entry.command);
  const scope = decodeActionScope(entry.scope);
  if (entry.version !== 1 || command.expectedRelationshipId !== scope.relationshipId || !Number.isSafeInteger(entry.sequence) || entry.sequence < 1 ||
      !Number.isSafeInteger(entry.attempts) || entry.attempts < 0 || typeof entry.everSent !== 'boolean' ||
      ![entry.createdAt, entry.updatedAt, entry.nextAttemptAt].every(Number.isFinite) ||
      !entry.state || !['pending', 'sending', 'confirmation_unknown', 'confirmed', 'rejected'].includes(entry.state.status)) throw new Error('Invalid saved command state');
  if (entry.state.status === 'confirmed') decodeActionReceipt(entry.state.receipt, command);
  else if (JSON.stringify(decodeActionCommand(entry.state.command)) !== JSON.stringify(command)) throw new Error('Saved command payload changed');
  if (entry.state.status === 'rejected' && typeof entry.state.reason !== 'string') throw new Error('Invalid saved rejection');
  if (entry.lease && (typeof entry.lease.token !== 'string' || !Number.isFinite(entry.lease.until))) throw new Error('Invalid command lease');
  if ((entry.lease !== null && entry.state.status !== 'sending') ||
      (entry.state.status === 'sending' && !entry.lease) ||
      (entry.state.status !== 'pending' && (!entry.everSent || entry.attempts < 1))) throw new Error('Inconsistent saved send state');
  if (entry.problem && (typeof entry.problem.code !== 'string' || typeof entry.problem.message !== 'string' || typeof entry.problem.retryable !== 'boolean')) throw new Error('Invalid saved command error');
  return structuredClone(entry);
}
