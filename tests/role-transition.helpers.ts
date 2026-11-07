import { emptyIdentity, type IdentityState } from '@/lib/identity';
import type { RoleIntent, RoleOptions, RoleReceipt, RoleRecord, RoleScope } from '@/data/roleTransitions/types';
import type { RoleStore } from '@/data/roleTransitions/store';
export const rid = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const roleScope: RoleScope = { backendId: 'https://roles.invalid', accountId: rid(1), relationshipId: rid(2), relationshipSessionId: rid(3) };
export const roleIdentity = (patch: Partial<IdentityState> = {}): IdentityState => ({ ...emptyIdentity('unlinked', roleScope.accountId), canAccessData: true, currentRole: 'dom',
  relationshipId: roleScope.relationshipId, relationshipSessionId: roleScope.relationshipSessionId, participantId: rid(4), lifecycleReady: true, ...patch });
export const roleOptions = (target: 'dom' | 'sub' = 'sub'): RoleOptions => ({ scope: { accountId: roleScope.accountId, relationshipId: roleScope.relationshipId, relationshipSessionId: roleScope.relationshipSessionId },
  role: target, current: { periodId: roleScope.relationshipId, role: 'dom', balance: -4, availableUses: 0 }, currentReviewToken: 'current-hash',
  saved: [{ periodId: rid(5), role: target, startedAt: '2026-01-01T12:00:00Z', endedAt: '2026-10-27T12:00:00Z', balance: 0, availableUses: 2, reviewToken: 'saved-hash' }] });
export const roleIntent = (): RoleIntent => ({ commandId: rid(6), scope: roleScope, role: 'sub', mode: 'resume', savedPeriodId: rid(5), currentReviewToken: 'current-hash', destinationReviewToken: 'saved-hash' });
export const roleReceipt = (intent = roleIntent()): RoleReceipt => ({ commandId: intent.commandId, accountId: intent.scope.accountId,
  from: { periodId: intent.scope.relationshipId, sessionId: intent.scope.relationshipSessionId }, to: { periodId: intent.savedPeriodId ?? rid(7), sessionId: rid(8), role: intent.role }, completedAt: '2026-11-06T12:00:00Z' });
export const roleRecord = (): RoleRecord => ({ version: 1, intent: roleIntent(), status: 'pending', receipt: null, problem: null });
export class MemoryRoleStore implements RoleStore {
  rows = new Map<string, RoleRecord>(); failSave = false; failRead = false;
  key(backend: string, account: string) { return JSON.stringify([backend, account]); }
  async read(backend: string, account: string) { if (this.failRead) throw new Error('storage'); return structuredClone(this.rows.get(this.key(backend, account)) ?? null); }
  async save(record: RoleRecord, expected: string | null) {
    if (this.failSave) throw new Error('storage'); const key = this.key(record.intent.scope.backendId, record.intent.scope.accountId);
    if ((this.rows.get(key)?.intent.commandId ?? null) !== expected) throw new Error('conflict'); this.rows.set(key, structuredClone(record));
  }
  async remove(record: RoleRecord) { const key = this.key(record.intent.scope.backendId, record.intent.scope.accountId); if (this.rows.get(key)?.intent.commandId !== record.intent.commandId) throw new Error('conflict'); this.rows.delete(key); }
}
export const roleDeferred = <T>() => { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
