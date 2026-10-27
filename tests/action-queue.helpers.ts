import { decodeQueueEntry, type ActionQueueScope, type NewQueueEntry, type QueueEntry, type RewardCommand, type QueuedActionCommand, type StoredActionReceipt } from '@/data/actions/contracts';
import type { ActionQueueStore } from '@/data/actions/store';
import type { QueueConnection } from '@/data/actions/queue';

export const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const scope: ActionQueueScope = { backendId: 'http://127.0.0.1:28622', accountId: uuid(1), participantId: uuid(2), relationshipId: uuid(3), relationshipSessionId: uuid(1000) };
export const command: RewardCommand = { commandId: uuid(4), expectedRelationshipId: scope.relationshipId, kind: 'reward_buy', rewardId: uuid(5), expectedCost: 20 };
export const receipt = (value: QueuedActionCommand = command): { -readonly [K in keyof StoredActionReceipt]: StoredActionReceipt[K] } => ({
  commandId: value.commandId, relationshipId: value.expectedRelationshipId, relationshipSessionId: scope.relationshipSessionId, eventIds: [uuid(6)], confirmedAt: '2026-10-26T12:00:00+00:00',
  balances: [{ participantId: scope.participantId, currency: 'sub', balance: 17 }], availableRewardQuantities: [], refunds: [], feedback: [],
});
export function deferred<T>() {
  let resolve!: (result: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
/** Atomic in-memory store for engine tests only. Native IDB has a browser fixture. */
export class MemoryQueueStore implements ActionQueueStore {
  records = new Map<string, QueueEntry>();
  failInsert = false;
  failUpdate = false;
  private sequence = 0;
  async insert(value: NewQueueEntry): Promise<QueueEntry> {
    if (this.failInsert) throw new Error('Disk unavailable');
    if (this.records.has(value.command.commandId)) throw new Error('Duplicate command');
    const entry = decodeQueueEntry({ ...structuredClone(value), sequence: ++this.sequence });
    this.records.set(entry.command.commandId, entry);
    return structuredClone(entry);
  }
  async list(): Promise<QueueEntry[]> { return [...this.records.values()].map(decodeQueueEntry); }
  async update(id: string, change: (current: QueueEntry) => QueueEntry | null): Promise<QueueEntry | null> {
    if (this.failUpdate) throw new Error('Disk unavailable');
    const current = this.records.get(id);
    if (!current) return null;
    const next = change(structuredClone(current));
    if (next) {
      if (JSON.stringify(next.command) !== JSON.stringify(current.command) || JSON.stringify(next.scope) !== JSON.stringify(current.scope)) throw new Error('Immutable command');
      this.records.set(id, decodeQueueEntry(next));
    } else this.records.delete(id);
    return next && structuredClone(next);
  }
}
export class TestConnection implements QueueConnection {
  online = false;
  listeners = new Set<() => void>();
  isOnline = () => this.online;
  subscribe = (changed: () => void) => { this.listeners.add(changed); return () => { this.listeners.delete(changed); }; };
  setOnline(value: boolean) { this.online = value; for (const listener of this.listeners) listener(); }
}
