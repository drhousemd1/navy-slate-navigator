import { decodeDeletionRecord, makeDeletionRecord, type DeletionRecord, type DeletionStatus } from '@/data/accountDeletion/types';
import type { DeletionStore } from '@/data/accountDeletion/store';
import { emptyIdentity } from '@/lib/identity';
export const id = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const scope = { backendId: 'https://deletion.invalid', accountId: id(1), relationshipId: id(2), relationshipSessionId: id(3) };
export const identity = () => ({ ...emptyIdentity('unlinked', scope.accountId), canAccessData: true, relationshipId: scope.relationshipId, relationshipSessionId: scope.relationshipSessionId, currentRole: 'dom' as const });
export const pending = (jobId: string): DeletionStatus => ({ jobId, state: 'pending', phase: 'storage', retryAfterMs: 0, completedAt: null });
export const complete = (jobId: string): DeletionStatus => ({ jobId, state: 'complete', phase: 'complete', retryAfterMs: 0, completedAt: '2026-11-06T12:00:00Z' });
export const record = () => makeDeletionRecord(scope);
export class MemoryDeletionStore implements DeletionStore {
  rows = new Map<string, DeletionRecord>(); fail = false;
  async list(backend: string) { if (this.fail) throw new Error('storage'); return structuredClone([...this.rows.values()].filter(row => row.scope.backendId === backend)); }
  async save(value: DeletionRecord, expected: string | null) {
    decodeDeletionRecord(value); if (this.fail || (this.rows.get(value.key)?.jobId ?? null) !== expected) throw new Error('storage');
    this.rows.set(value.key, structuredClone(value));
  }
  async remove(value: DeletionRecord) { if (value.attempted && !value.startRejected && !value.cleanupComplete) throw new Error('unconfirmed'); this.rows.delete(value.key); }
}
export const deferred = <T>() => { let resolve!: (value: T) => void; let reject!: (value: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
