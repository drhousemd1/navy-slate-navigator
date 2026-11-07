import { z } from 'zod';
const uuid = z.string().uuid();
export const deletionScopeSchema = z.object({ backendId: z.string().url(), accountId: uuid, relationshipId: uuid, relationshipSessionId: uuid }).strict();
export type DeletionScope = z.infer<typeof deletionScopeSchema>;
export const deletionScopeKey = (scope: Partial<DeletionScope> | null) => scope ? JSON.stringify([scope.backendId, scope.accountId, scope.relationshipId, scope.relationshipSessionId]) : '';
export const deletionStatusSchema = z.object({ jobId: uuid, state: z.enum(['pending', 'retry_required', 'complete']), phase: z.enum(['storage', 'account', 'complete']),
  retryAfterMs: z.number().int().safe().min(0).max(86_400_000), completedAt: z.string().datetime({ offset: true }).nullable() }).strict().refine(value =>
    value.state === 'complete' ? value.phase === 'complete' && value.completedAt !== null && value.retryAfterMs === 0 : value.phase !== 'complete' && value.completedAt === null);
export type DeletionStatus = z.infer<typeof deletionStatusSchema>;
export const deletionRecordSchema = z.object({ version: z.literal(1), key: z.string(), jobId: uuid, scope: deletionScopeSchema.extend({ relationshipId: uuid.nullable(), relationshipSessionId: uuid.nullable() }),
  recoveryToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/).nullable(), createdAt: z.string().datetime({ offset: true }), attempted: z.boolean(),
  status: deletionStatusSchema.nullable(), startRejected: z.string().nullable(), nextCheckAt: z.number().int().safe().nonnegative(),
  cleanupComplete: z.boolean(), legacyPreserved: z.boolean() }).strict();
export type DeletionRecord = z.infer<typeof deletionRecordSchema>;
export const deletionRecordKey = (backend: string, account: string) => JSON.stringify([backend, account]);
export function decodeDeletionRecord(value: unknown): DeletionRecord {
  const record = deletionRecordSchema.parse(value);
  if (record.key !== deletionRecordKey(record.scope.backendId, record.scope.accountId) || record.status && record.status.jobId !== record.jobId ||
    record.cleanupComplete !== (record.recoveryToken === null) || record.cleanupComplete && record.status?.state !== 'complete' || record.status && record.startRejected) throw new Error('DELETION_STORAGE_INVALID');
  if (!record.cleanupComplete) deletionScopeSchema.parse(record.scope);
  else if (record.scope.relationshipId !== null || record.scope.relationshipSessionId !== null) throw new Error('DELETION_STORAGE_INVALID');
  return record;
}
export function decodeDeletionStatus(value: unknown, jobId: string): DeletionStatus {
  const status = deletionStatusSchema.parse(value); if (status.jobId !== jobId) throw new Error('DELETION_RESPONSE_INVALID'); return status;
}
export function makeDeletionRecord(scope: DeletionScope): DeletionRecord {
  deletionScopeSchema.parse(scope);
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const recoveryToken = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { version: 1, key: deletionRecordKey(scope.backendId, scope.accountId), jobId: crypto.randomUUID(), scope: { ...scope }, recoveryToken,
    createdAt: new Date().toISOString(), attempted: false, status: null, startRejected: null, nextCheckAt: 0, cleanupComplete: false, legacyPreserved: false };
}
