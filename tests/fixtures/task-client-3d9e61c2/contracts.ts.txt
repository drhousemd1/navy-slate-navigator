import { z } from 'zod';
import type { ActionCommand, ActionReceipt, ActionExpectedContext, StoredActionCommand } from '@/domain/actions/types';

export type RewardCommand = Extract<ActionCommand, { kind: 'reward_buy' | 'reward_redeem' | 'reward_delete' | 'reward_gift' | 'undo' }>;
type Intent<T> = T extends unknown ? Omit<T, 'commandId' | 'expectedRelationshipId'> : never;
/** Historical commands keep absent review facts absent. New intents require them. */
export type QueuedActionCommand = StoredActionCommand;
export type ActionIntent = Intent<ActionCommand>;
type StoredActionState =
  | { readonly status: 'pending' | 'sending' | 'confirmation_unknown'; readonly command: QueuedActionCommand }
  | { readonly status: 'confirmed'; readonly receipt: StoredActionReceipt }
  | { readonly status: 'rejected'; readonly command: QueuedActionCommand; readonly reason: string };
/** Compatibility name for existing consumers of the shared action queue. */
export type RewardIntent = ActionIntent;
export interface StoredActionScope {
  readonly backendId: string;
  readonly accountId: string;
  readonly participantId: string;
  readonly relationshipId: string;
  /** Absent only on historical durable rows. Never filled from current identity. */
  readonly relationshipSessionId?: string;
}
export interface ActionQueueScope extends StoredActionScope { readonly relationshipSessionId: string }
export type StoredActionReceipt = ActionReceipt & { readonly relationshipSessionId?: string };
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
  | { kind: 'confirmed'; receipt: StoredActionReceipt }
  | { kind: 'rejected' | 'confirmation_unknown' | 'not_sent'; problem: ActionProblem };
export type ReceiptRecoveryOutcome = { kind: 'confirmed'; receipt: StoredActionReceipt } | { kind: 'not_found' } |
  { kind: 'unavailable'; problem: ActionProblem };
export interface ActionTransport {
  readonly backendId: string;
  execute(command: QueuedActionCommand, scope: ActionQueueScope, signal: AbortSignal): Promise<CommandOutcome>;
  /** Read only. It can never create or retry an old unconfirmed command. */
  readReceipt?(command: QueuedActionCommand, scope: StoredActionScope, signal: AbortSignal): Promise<ReceiptRecoveryOutcome>;
}
export type RewardTransport = ActionTransport;

const id = z.string().uuid();
const currency = z.enum(['dom', 'sub']);
const integer = z.number().finite().int().safe();
const amount = integer.nonnegative();
const scopeFields = { backendId: z.string().url(), accountId: id, participantId: id, relationshipId: id };
export const storedScopeSchema = z.object({ ...scopeFields, relationshipSessionId: id.optional() }).strict();
export const scopeSchema = z.object({ ...scopeFields, relationshipSessionId: id }).strict();
const feedbackBase = { eventId: id, recipientParticipantId: id, subjectTitle: z.string() };
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Invalid calendar date');
const timeZone = z.string().min(1).refine(value => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
}, 'Invalid saved timezone');
const calendarFields = { timeZone, localDate, weekStartDate: localDate };
function validWeek(value: { localDate: string; weekStartDate: string }) {
  const start = new Date(`${value.weekStartDate}T00:00:00Z`);
  const day = (Date.parse(`${value.localDate}T00:00:00Z`) - start.getTime()) / 86400000;
  return start.getUTCDay() === 1 && Number.isInteger(day) && day >= 0 && day < 7;
}
const calendarSchema = z.object({ participantId: id, ...calendarFields }).strict().refine(validWeek, 'Invalid affected calendar');
export const taskExpectedContextSchema = z.object({ version: z.literal(1), kind: z.literal('task_complete'), subjectId: id,
  beneficiaryParticipantId: id, currency, points: amount.max(2147483647), frequency: z.enum(['daily', 'weekly']),
  target: integer.positive().max(2147483647), ...calendarFields }).strict().refine(validWeek, 'Invalid affected calendar');
export const ruleExpectedContextSchema = z.object({ version: z.literal(1), kind: z.literal('rule_violation'), subjectId: id, sub: calendarSchema }).strict();
export const punishmentExpectedContextSchema = z.object({ version: z.literal(1), kind: z.literal('punishment_apply'), subjectId: id,
  subDeduction: amount.max(2147483647), domAward: amount.max(2147483647), sub: calendarSchema, dom: calendarSchema.nullable(),
}).strict().refine(value => (!value.dom || value.domAward > 0) && value.dom?.participantId !== value.sub.participantId, 'Invalid affected participants');
export const expectedContextSchema = z.union([taskExpectedContextSchema, ruleExpectedContextSchema, punishmentExpectedContextSchema]);
export function decodeExpectedContext(value: unknown): ActionExpectedContext { return expectedContextSchema.parse(value) as ActionExpectedContext; }
const commandBase = { commandId: id, expectedRelationshipId: id };
export const commandSchema = z.discriminatedUnion('kind', [
  z.object({ ...commandBase, kind: z.literal('task_complete'), taskId: id, expectedContext: taskExpectedContextSchema.optional() }).strict(),
  z.object({ ...commandBase, kind: z.literal('rule_violation'), ruleId: id, expectedContext: ruleExpectedContextSchema.optional() }).strict(),
  z.object({ ...commandBase, kind: z.literal('punishment_apply'), punishmentId: id, expectedContext: punishmentExpectedContextSchema.optional() }).strict(),
  z.object({ ...commandBase, kind: z.literal('reward_buy'), rewardId: id, expectedCost: amount.max(2147483647) }).strict(),
  z.object({ ...commandBase, kind: z.literal('reward_delete'), rewardId: id }).strict(),
  z.object({ ...commandBase, kind: z.literal('reward_gift'), rewardId: id }).strict(),
  z.object({ ...commandBase, kind: z.literal('reward_redeem'), rewardId: id, inventoryCurrency: currency.optional() }).strict(),
  z.object({ ...commandBase, kind: z.literal('undo'), eventId: id }).strict(),
]);
export const needsExpectedContext = (command: QueuedActionCommand) => ['task_complete', 'rule_violation', 'punishment_apply'].includes(command.kind);
export const hasExpectedContext = (command: QueuedActionCommand) => !needsExpectedContext(command) || ('expectedContext' in command && !!command.expectedContext);
export const contextReviewCodes = new Set(['ACTION_CONTEXT_REQUIRED', 'ACTION_CONTEXT_INVALID', 'ACTION_BENEFICIARY_CHANGED',
  'ACTION_DEFINITION_CHANGED', 'ACTION_TIMEZONE_CHANGED', 'ACTION_DATE_CHANGED']);
export const needsContextReview = (entry: Pick<QueueEntry, 'command' | 'problem'>) => !hasExpectedContext(entry.command) || contextReviewCodes.has(entry.problem?.code);
/** A read-only unknown result still blocks a replacement in this exact connection. */
export function blocksNewAction(entry: Pick<QueueEntry, 'scope' | 'command' | 'state' | 'everSent'> & { canReplay?: boolean }, scope: StoredActionScope | null): boolean {
  const same = scope && entry.scope ? scopeKey(entry.scope) === scopeKey(scope) : entry.canReplay === true;
  return !!same && (entry.state.status === 'sending' || entry.state.status === 'confirmation_unknown' ||
    (entry.state.status === 'pending' && (hasExpectedContext(entry.command) || entry.everSent)));
}

const progressBase = {
  beneficiaryParticipantId: id, timeZone: z.string().min(1), localDate,
  weekStartDate: localDate, weekIdentifier: z.string().regex(/^\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])$/),
  usageData: z.array(amount).length(7), currentCount: amount, deleted: z.boolean(),
};
const taskProgressSchema = z.object({ ...progressBase, taskId: id, currency,
  expectedContext: taskExpectedContextSchema.optional(),
  frequency: z.enum(['daily', 'weekly']), target: integer.positive(), completed: z.boolean(), lastCompletedDate: localDate.nullable(),
});
const recordingProgressSchema = z.object({ ...progressBase, subjectType: z.enum(['rule', 'punishment']), subjectId: id, expectedContext: z.union([ruleExpectedContextSchema, punishmentExpectedContextSchema]).optional() });
const receiptSchema = z.object({
  commandId: id, relationshipId: id, relationshipSessionId: id.optional(), eventIds: z.array(id).min(1), confirmedAt: z.string().datetime({ offset: true }),
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
}).strict();

export function decodeStoredActionCommand(value: unknown): QueuedActionCommand {
  const command = commandSchema.parse(value) as QueuedActionCommand;
  if ('expectedContext' in command && command.expectedContext) {
    const subjectId = command.kind === 'task_complete' ? command.taskId : command.kind === 'rule_violation' ? command.ruleId : command.punishmentId;
    if (command.expectedContext.subjectId !== subjectId) throw new Error('Reviewed context belongs to a different action');
  }
  return command;
}
export function decodeActionCommand(value: unknown): ActionCommand {
  const command = decodeStoredActionCommand(value);
  if (!hasExpectedContext(command)) throw new Error('Refresh and review the current action before saving it.');
  return command as ActionCommand;
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
export function decodeStoredActionScope(value: unknown): StoredActionScope {
  return storedScopeSchema.parse(value) as StoredActionScope;
}
export function scopeKey(scope: StoredActionScope): string {
  return JSON.stringify([scope.backendId, scope.accountId, scope.participantId, scope.relationshipId, scope.relationshipSessionId ?? null]);
}
export function decodeActionReceipt(value: unknown, command: QueuedActionCommand, expectedSession?: string): StoredActionReceipt {
  const receipt = receiptSchema.parse(value);
  if (receipt.commandId !== command.commandId || receipt.relationshipId !== command.expectedRelationshipId) throw new Error('Receipt does not match the original command');
  if (expectedSession !== undefined && receipt.relationshipSessionId !== expectedSession) throw new Error('Receipt does not match the original relationship session');
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
    if (progress.expectedContext) {
      const context = progress.expectedContext;
      if (context.kind === 'task_complete') {
        if (progress !== receipt.taskProgress || context.subjectId !== receipt.taskProgress.taskId || context.currency !== receipt.taskProgress.currency ||
          context.frequency !== receipt.taskProgress.frequency || context.target !== receipt.taskProgress.target || context.beneficiaryParticipantId !== progress.beneficiaryParticipantId ||
          context.timeZone !== progress.timeZone || context.localDate !== progress.localDate || context.weekStartDate !== progress.weekStartDate) throw new Error('Inconsistent reviewed task progress');
      } else if (progress !== receipt.recordingProgress || context.kind !== (receipt.recordingProgress.subjectType === 'rule' ? 'rule_violation' : 'punishment_apply') ||
        context.subjectId !== receipt.recordingProgress.subjectId || context.sub.participantId !== progress.beneficiaryParticipantId || context.sub.timeZone !== progress.timeZone ||
        context.sub.localDate !== progress.localDate || context.sub.weekStartDate !== progress.weekStartDate) throw new Error('Inconsistent reviewed recording progress');
    }
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
  return receipt as StoredActionReceipt;
}

export interface QueueEntry {
  readonly version: 1;
  readonly sequence: number;
  readonly scope: StoredActionScope;
  readonly command: QueuedActionCommand;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly state: StoredActionState;
  readonly attempts: number;
  readonly everSent: boolean;
  readonly nextAttemptAt: number;
  readonly problem: ActionProblem | null;
  readonly lease: { readonly token: string; readonly until: number } | null;
  /** Read-only reconciliation provenance, not an invented execution attempt. */
  readonly receiptRecoveredAt?: number;
}
export type NewQueueEntry = Omit<QueueEntry, 'sequence' | 'scope' | 'command'> & { readonly scope: ActionQueueScope; readonly command: ActionCommand };

/** Reject corrupt records without deleting or attempting them. */
export function decodeQueueEntry(value: unknown): QueueEntry {
  if (!value || typeof value !== 'object') throw new Error('Invalid saved command');
  const entry = value as QueueEntry;
  const command = decodeStoredActionCommand(entry.command);
  const scope = decodeStoredActionScope(entry.scope);
  if (entry.version !== 1 || command.expectedRelationshipId !== scope.relationshipId || !Number.isSafeInteger(entry.sequence) || entry.sequence < 1 ||
      !Number.isSafeInteger(entry.attempts) || entry.attempts < 0 || typeof entry.everSent !== 'boolean' ||
      ![entry.createdAt, entry.updatedAt, entry.nextAttemptAt].every(Number.isFinite) ||
      !entry.state || !['pending', 'sending', 'confirmation_unknown', 'confirmed', 'rejected'].includes(entry.state.status)) throw new Error('Invalid saved command state');
  if (entry.state.status === 'confirmed') decodeActionReceipt(entry.state.receipt, command, scope.relationshipSessionId);
  else if (JSON.stringify(decodeStoredActionCommand(entry.state.command)) !== JSON.stringify(command)) throw new Error('Saved command payload changed');
  if (entry.state.status === 'rejected' && typeof entry.state.reason !== 'string') throw new Error('Invalid saved rejection');
  if (entry.lease && (typeof entry.lease.token !== 'string' || !Number.isFinite(entry.lease.until))) throw new Error('Invalid command lease');
  if (entry.receiptRecoveredAt !== undefined && (entry.state.status !== 'confirmed' || !Number.isFinite(entry.receiptRecoveredAt) || entry.receiptRecoveredAt <= 0)) throw new Error('Invalid receipt recovery provenance');
  if ((entry.lease !== null && entry.state.status !== 'sending') ||
      (entry.state.status === 'sending' && !entry.lease) ||
      (entry.state.status !== 'pending' && entry.receiptRecoveredAt === undefined && (!entry.everSent || entry.attempts < 1))) throw new Error('Inconsistent saved send state');
  if (entry.problem && (typeof entry.problem.code !== 'string' || typeof entry.problem.message !== 'string' || typeof entry.problem.retryable !== 'boolean')) throw new Error('Invalid saved command error');
  return structuredClone(entry);
}
