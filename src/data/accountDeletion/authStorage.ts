import { isDeletedAccount, requireUndeletedAccount } from './tombstone';

function sessionAccount(raw: string): string {
  let value: unknown; try { value = JSON.parse(raw); } catch { throw new Error('Stored session ownership could not be verified.'); }
  const account = (value as { user?: { id?: unknown } } | null)?.user?.id;
  if (typeof account !== 'string' || !account) throw new Error('Stored session ownership could not be verified.');
  return account;
}
/** Installed auth-js reads this storage on every _useSession and saves through
 * _saveSession. Reject late session writes for an explicitly deleted account. */
export function deletionAwareAuthStorage(backend: string, key: string, storage: Storage) {
  return {
    getItem(name: string) {
      const raw = storage.getItem(name);
      if (name === key && raw) {
        let account: string; try { account = sessionAccount(raw); } catch { return raw; }
        if (isDeletedAccount(backend, account)) return null;
      }
      return raw;
    },
    setItem(name: string, value: string) {
      if (name === key) requireUndeletedAccount(backend, sessionAccount(value));
      storage.setItem(name, value);
    },
    removeItem(name: string) { storage.removeItem(name); },
  };
}
/** No SDK signOut here: it would re-read and potentially remove a newer session.
 * Use the installed SDK's same browser lock, then a synchronous exact-owner read
 * and removal. PKCE verifier bytes have no account metadata and remain intact. */
export async function removeDeletedAccountSession(backend: string, key: string, account: string, storage: Storage = localStorage, locks: LockManager | undefined = globalThis.navigator?.locks): Promise<'removed' | 'absent' | 'other_account'> {
  requireConfirmedDeletion(backend, account);
  const controller = new AbortController(); let expired = false;
  let rejectDeadline!: (error: Error) => void;
  const deadline = new Promise<never>((_resolve, reject) => { rejectDeadline = reject; });
  const timer = setTimeout(() => { expired = true; controller.abort(); rejectDeadline(new Error('Local session cleanup needs another attempt.')); }, 5_000);
  const remove = () => {
    if (expired) throw new Error('Local session cleanup needs another attempt.');
    const raw = storage.getItem(key); if (raw === null) return 'absent' as const;
    if (sessionAccount(raw) !== account) return 'other_account' as const;
    storage.removeItem(key); return 'removed' as const;
  };
  try { return await Promise.race([deadline, locks ? locks.request(`lock:${key}`, { mode: 'exclusive', signal: controller.signal }, remove) : Promise.resolve(remove())]); }
  finally { expired = true; clearTimeout(timer); }
}
function requireConfirmedDeletion(backend: string, account: string) {
  if (!isDeletedAccount(backend, account)) throw new Error('Server deletion is not confirmed for local session cleanup.');
}
