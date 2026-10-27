import { z } from 'zod';
import { scopeSchema, scopeKey, type ActionQueueScope, type QueueEntry } from '@/data/actions/contracts';
import type { RewardActionData } from '@/data/rewards/actionReadModel';

const money = z.number().int().safe();
const snapshotSchema = z.object({
  version: z.literal(1), scope: scopeSchema, savedAt: z.number().finite().positive(),
  wallets: z.array(z.object({ currency: z.enum(['sub', 'dom']), balance: money }).strict()).max(2),
  availableRewards: z.array(z.object({ currency: z.enum(['sub', 'dom']), quantity: money.nonnegative() }).strict()).max(2),
}).strict();
export type RecoverySnapshot = z.infer<typeof snapshotSchema> & { scope: ActionQueueScope };
export type RecoveryAccess = 'checking' | 'verified' | 'unreachable' | 'denied';
const access = new Map<string, RecoveryAccess>();
const verified = new Map<string, ActionQueueScope>();
const listeners = new Set<() => void>();
const storageKey = (backend: string) => `obedience-recovery-v1:${encodeURIComponent(backend)}`;
const accessKey = (backend: string, account: string) => JSON.stringify([backend, account]);
const changed = () => { for (const listener of listeners) listener(); };
export const subscribeRecovery = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const recoveryAccess = (backend: string, account: string) => access.get(accessKey(backend, account)) ?? 'checking';

/** Only recognizable transport failures permit a frozen view. Auth/permission,
 * malformed responses and unknown server errors always fail closed. */
export function isTransportUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /(?:failed to fetch|fetch failed|load failed|networkerror|network request failed|network error|ECONNREFUSED|ERR_CONNECTION_REFUSED)/i.test(message) &&
    !/(?:401|403|permission|unauthorized|forbidden|AUTH_REQUIRED|ACCOUNT_CHANGED)/i.test(message);
}
export function setRecoveryAccess(backend: string, account: string, value: RecoveryAccess) {
  const key = accessKey(backend, account);
  if (value !== 'verified') verified.delete(key);
  if (value === 'denied') clearRecoverySnapshot(backend);
  if (access.get(key) !== value) { access.set(key, value); changed(); }
}
export function clearRecoverySnapshot(backend: string) {
  try { localStorage.removeItem(storageKey(backend)); } catch { /* Unavailable storage is never authority. */ }
}
/** Logout removes both frozen display data and its in-memory provenance. It
 * intentionally does not open or delete the independent command database. */
export function forgetRecovery(backend: string) {
  clearRecoverySnapshot(backend);
  for (const key of access.keys()) if (JSON.parse(key)[0] === backend) access.delete(key);
  for (const [key, scope] of verified) if (scope.backendId === backend) verified.delete(key);
  changed();
}
export function readRecoverySnapshot(backend: string, account: string): RecoverySnapshot | null {
  try {
    const raw = localStorage.getItem(storageKey(backend));
    if (!raw) return null;
    const result = snapshotSchema.safeParse(JSON.parse(raw));
    if (!result.success || result.data.scope.backendId !== backend || result.data.scope.accountId !== account) return null;
    return result.data as RecoverySnapshot;
  } catch { return null; }
}
/** Call only after auth initialization. Initial user=null must not erase a
 * signed-in session's recovery snapshot before Supabase restores that session. */
export function reconcileRecoveryAccount(backend: string, account: string | null) {
  if (!account) { forgetRecovery(backend); return; }
  for (const [key, scope] of verified) if (scope.backendId === backend && scope.accountId !== account) verified.delete(key);
  for (const key of access.keys()) { const [storedBackend, storedAccount] = JSON.parse(key); if (storedBackend === backend && storedAccount !== account) access.delete(key); }
  if (!readRecoverySnapshot(backend, account)) clearRecoverySnapshot(backend);
}
export function verifyRecoveryScope(scope: ActionQueueScope) {
  const previous = readRecoverySnapshot(scope.backendId, scope.accountId);
  if (previous && scopeKey(previous.scope) !== scopeKey(scope)) clearRecoverySnapshot(scope.backendId);
  verified.set(accessKey(scope.backendId, scope.accountId), { ...scope });
  setRecoveryAccess(scope.backendId, scope.accountId, 'verified');
}
/** Explicit projection: no profile, partner identifier/avatar, catalog title,
 * event subject, message, permissions, token or arbitrary query data is stored. */
export function projectRecoverySnapshot(scope: ActionQueueScope, data: RewardActionData, savedAt: number): RecoverySnapshot {
  return snapshotSchema.parse({ version: 1, scope: { ...scope }, savedAt,
    wallets: data.wallets.filter(row => row.participant_id === scope.participantId && row.relationship_id === scope.relationshipId)
      .map(row => ({ currency: row.currency, balance: row.balance })),
    availableRewards: (['sub', 'dom'] as const).map(currency => ({ currency, quantity: data.lots.filter(row =>
      row.owner_participant_id === scope.participantId && row.relationship_id === scope.relationshipId && row.currency === currency && row.status === 'available').length })),
  }) as RecoverySnapshot;
}
export function saveRecoverySnapshot(snapshot: RecoverySnapshot): boolean {
  const active = verified.get(accessKey(snapshot.scope.backendId, snapshot.scope.accountId));
  if (!active || scopeKey(active) !== scopeKey(snapshot.scope)) return false;
  try { localStorage.setItem(storageKey(snapshot.scope.backendId), JSON.stringify(snapshotSchema.parse(snapshot))); return true; }
  catch { return false; }
}
/** A read-only projection of the original command store. It deliberately omits
 * targets, receipts, free-text errors and all other accounts/backends. */
export function recoveryCommands(rows: readonly QueueEntry[], backend: string, account: string) {
  return rows.filter(row => row.scope.backendId === backend && row.scope.accountId === account && row.state.status !== 'confirmed')
    .sort((a, b) => a.sequence - b.sequence)
    .map(row => ({ id: row.command.commandId, kind: row.command.kind, status: row.state.status, createdAt: row.createdAt }));
}
