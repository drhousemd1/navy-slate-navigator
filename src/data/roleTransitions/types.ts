import { z } from 'zod';
import type { ProfileRole } from '@/types/profile';

const uuid = z.string().uuid();
const role = z.enum(['dom', 'sub']);
const count = z.number().int().safe().nonnegative();
const balance = z.number().int().safe();
const token = z.string().min(1);
export const roleScopeSchema = z.object({ backendId: z.string().min(1), accountId: uuid, relationshipId: uuid, relationshipSessionId: uuid }).strict();
export type RoleScope = z.infer<typeof roleScopeSchema>;
export const roleScopeKey = (scope: RoleScope | null) => scope ? JSON.stringify([scope.backendId, scope.accountId, scope.relationshipId, scope.relationshipSessionId]) : '';
const summary = z.object({ periodId: uuid, role, balance, availableUses: count }).strict();
const optionsSchema = z.object({ scope: roleScopeSchema.omit({ backendId: true }), role, current: summary, currentReviewToken: token,
  saved: z.array(summary.extend({ startedAt: z.string().datetime({ offset: true }), endedAt: z.string().datetime({ offset: true }).nullable(), reviewToken: token }).strict()) }).strict();
export type RoleOptions = z.infer<typeof optionsSchema>;
export const intentSchema = z.object({ commandId: uuid, scope: roleScopeSchema, role, mode: z.enum(['fresh', 'resume']), savedPeriodId: uuid.nullable(),
  currentReviewToken: token, destinationReviewToken: token.nullable() }).strict().refine(value => value.mode === 'fresh'
    ? value.savedPeriodId === null && value.destinationReviewToken === null
    : value.savedPeriodId !== null && value.savedPeriodId !== value.scope.relationshipId && value.destinationReviewToken !== null);
export type RoleIntent = z.infer<typeof intentSchema>;
const receiptSchema = z.object({ commandId: uuid, accountId: uuid, from: z.object({ periodId: uuid, sessionId: uuid }).strict(),
  to: z.object({ periodId: uuid, sessionId: uuid, role }).strict(), completedAt: z.string().datetime({ offset: true }) }).strict();
export type RoleReceipt = z.infer<typeof receiptSchema>;
export const recordSchema = z.object({ version: z.literal(1), intent: intentSchema, status: z.enum(['pending', 'rejected', 'completed']),
  receipt: receiptSchema.nullable(), problem: z.string().nullable() }).strict();
export type RoleRecord = z.infer<typeof recordSchema>;
export function decodeRoleOptions(value: unknown, scope: RoleScope, target: ProfileRole): RoleOptions {
  const result = optionsSchema.parse(value);
  if (result.scope.accountId !== scope.accountId || result.scope.relationshipId !== scope.relationshipId || result.scope.relationshipSessionId !== scope.relationshipSessionId ||
    result.current.periodId !== scope.relationshipId || result.role !== target || result.saved.some(item => item.role !== target || item.periodId === scope.relationshipId) ||
    new Set(result.saved.map(item => item.periodId)).size !== result.saved.length) throw new Error('INVALID_ROLE_RESPONSE');
  return result;
}
export function decodeRoleReceipt(value: unknown, intent: RoleIntent): RoleReceipt {
  const result = receiptSchema.parse(value);
  if (result.commandId !== intent.commandId || result.accountId !== intent.scope.accountId || result.from.periodId !== intent.scope.relationshipId ||
    result.from.sessionId !== intent.scope.relationshipSessionId || result.to.role !== intent.role || result.to.sessionId === result.from.sessionId ||
    result.to.periodId === result.from.periodId || intent.mode === 'resume' && result.to.periodId !== intent.savedPeriodId) throw new Error('INVALID_ROLE_RESPONSE');
  return result;
}
export function decodeRoleResult(value: unknown, intent: RoleIntent): RoleReceipt | null {
  const result = z.object({ receipt: z.unknown().nullable() }).strict().parse(value);
  if (!Object.prototype.hasOwnProperty.call(result, 'receipt')) throw new Error('INVALID_ROLE_RESPONSE');
  return result.receipt === null ? null : decodeRoleReceipt(result.receipt, intent);
}
