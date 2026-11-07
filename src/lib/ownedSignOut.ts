import type { Session } from '@supabase/supabase-js';

export interface SessionOwner { backendId: string; accountId: string; sessionId: string }
export const OWNED_SIGN_OUT_EVENT = 'obedience:session-ended';
const channelName = (backend: string) => `obedience:session-ended:v1:${backend}`;
/** Session claims are used only to compare local ownership, never to authorize an API. */
export function sessionOwner(backendId: string, session: Pick<Session, 'access_token' | 'user'> | null): SessionOwner | null {
  if (!session?.user?.id || !session.access_token) return null;
  try {
    const part = session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(part));
    return typeof payload.session_id === 'string' && payload.session_id && payload.sub === session.user.id
      ? { backendId, accountId: session.user.id, sessionId: payload.session_id } : null;
  } catch { return null; }
}
export const sameSessionOwner = (a: SessionOwner | null, b: SessionOwner | null) => !!a && !!b && a.backendId === b.backendId && a.accountId === b.accountId && a.sessionId === b.sessionId;
export function storedSessionOwner(backend: string, key: string, storage: Storage): SessionOwner | null {
  const raw = storage.getItem(key); if (!raw) return null;
  try { return sessionOwner(backend, JSON.parse(raw)); } catch { return null; }
}
export interface SignOutDependencies {
  backendId: string; storageKey: string; storage: Storage; locks?: LockManager;
  revoke: (jwt: string, scope: 'local') => Promise<{ error: { status?: number; message: string } | null }>;
  notify: (owner: SessionOwner) => void;
}
/** Never call SDK signOut: after its async lock it re-reads the session and may
 * revoke/remove a later login. Revoke this captured JWT, then compare inside the
 * installed SDK's browser lock before synchronously removing exactly its session.
 * No PKCE verifier or other unknown/unowned bytes are removed. */
export async function signOutOwnedSession(session: Session, deps: SignOutDependencies): Promise<'removed' | 'absent' | 'replacement'> {
  const owner = sessionOwner(deps.backendId, session);
  if (!owner) throw new Error('Session ownership could not be verified. Reload before signing out.');
  const { error } = await deps.revoke(session.access_token, 'local');
  if (error && ![401, 403, 404].includes(error.status ?? 0)) throw new Error(error.message);
  const controller = new AbortController(); let expired = false;
  let rejectDeadline!: (error: Error) => void;
  const deadline = new Promise<never>((_resolve, reject) => { rejectDeadline = reject; });
  const timer = setTimeout(() => { expired = true; controller.abort(); rejectDeadline(new Error('Session removal needs another attempt.')); }, 5_000);
  const remove = () => {
    if (expired) throw new Error('Session removal needs another attempt.');
    const raw = deps.storage.getItem(deps.storageKey);
    if (raw === null) return 'absent' as const;
    if (!sameSessionOwner(owner, storedSessionOwner(deps.backendId, deps.storageKey, deps.storage))) return 'replacement' as const;
    deps.storage.removeItem(deps.storageKey);
    return 'removed' as const;
  };
  try {
    const result = await Promise.race([deadline, deps.locks ? deps.locks.request(`lock:${deps.storageKey}`, { mode: 'exclusive', signal: controller.signal }, remove) : Promise.resolve(remove())]);
    // This notification contains no credential; each recipient compares its own session.
    // Notify even if a replacement now owns storage: another tab may still show the departed session.
    deps.notify(owner);
    return result;
  } finally { expired = true; clearTimeout(timer); }
}
export function notifyOwnedSignOut(owner: SessionOwner) {
  window.dispatchEvent(new CustomEvent(OWNED_SIGN_OUT_EVENT, { detail: owner }));
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(channelName(owner.backendId));
    channel.postMessage(owner); channel.close();
  }
}
export function subscribeOwnedSignOut(backend: string, storageKey: string, listener: (owner: SessionOwner) => void, storage: Storage = localStorage) {
  const accept = (value: unknown) => {
    const owner = value as Partial<SessionOwner> | null;
    if (owner?.backendId === backend && typeof owner.accountId === 'string' && typeof owner.sessionId === 'string') listener(owner as SessionOwner);
  };
  const local = (event: Event) => accept((event as CustomEvent).detail);
  // Native storage events cover browsers without BroadcastChannel and no generic SDK broadcast is emitted.
  const changed = (event: StorageEvent) => {
    if (event.storageArea !== storage || event.key !== storageKey || event.newValue !== null || !event.oldValue) return;
    let old: Session | null = null; try { old = JSON.parse(event.oldValue); } catch { return; }
    accept(sessionOwner(backend, old));
  };
  window.addEventListener(OWNED_SIGN_OUT_EVENT, local); window.addEventListener('storage', changed);
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(channelName(backend)) : null;
  if (channel) channel.onmessage = event => accept(event.data);
  return () => { window.removeEventListener(OWNED_SIGN_OUT_EVENT, local); window.removeEventListener('storage', changed); channel?.close(); };
}
