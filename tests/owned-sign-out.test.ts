import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { signOutOwnedSession, sessionOwner, sameSessionOwner, subscribeOwnedSignOut, OWNED_SIGN_OUT_EVENT, type SessionOwner } from '@/lib/ownedSignOut';
const backendId = 'https://auth.invalid', storageKey = 'sb-auth-auth-token';
export const session = (account = 'A', id = 'session-1', rotation = 1) => ({ user: { id: account }, access_token: `e30.${btoa(JSON.stringify({ sub: account, session_id: id, rotation }))}.signature` }) as Session;
const put = (value: Session) => localStorage.setItem(storageKey, JSON.stringify(value));
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; };
beforeEach(() => { localStorage.clear(); vi.stubGlobal('BroadcastChannel', undefined); });
describe('ordinary exact-session logout', () => {
  it('uses local revocation for the captured JWT, removes only its session, and keeps PKCE/drafts/unknown keys', async () => {
    const current = session(); put(current); for (const key of ['kingdom-app-form-old', 'APP_QUERY_CACHE', storageKey+'-code-verifier', 'pending-action']) localStorage.setItem(key, 'keep');
    const revoke = vi.fn(async () => ({ error: null })), notify = vi.fn();
    expect(await signOutOwnedSession(current, { backendId, storageKey, storage: localStorage, revoke, notify })).toBe('removed');
    expect(revoke).toHaveBeenCalledWith(current.access_token, 'local'); expect(localStorage.length).toBe(4); expect(notify).toHaveBeenCalledWith(sessionOwner(backendId, current));
    expect(JSON.stringify(notify.mock.calls)).not.toContain(current.access_token);
  });
  it.each([session('B'), session('A', 'new-session')])('preserves a replacement login arriving during revocation (%j)', async replacement => {
    const current = session(); put(current); const wait = deferred<{ error: null }>(); const notify = vi.fn();
    const pending = signOutOwnedSession(current, { backendId, storageKey, storage: localStorage, revoke: () => wait.promise, notify });
    put(replacement); wait.resolve({ error: null }); expect(await pending).toBe('replacement'); expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(replacement));
    expect(notify).toHaveBeenCalledWith(sessionOwner(backendId, current));
  });
  it('checks after waiting for the actual browser lock, not just before invoking auth', async () => {
    const current = session(); put(current); const locked = deferred<'replacement'>(); let remove!: () => 'replacement';
    const request = vi.fn((_name, _options, callback) => { remove = callback; return locked.promise; });
    const pending = signOutOwnedSession(current, { backendId, storageKey, storage: localStorage, locks: { request } as unknown as LockManager, revoke: async () => ({ error: null }), notify: vi.fn() });
    await Promise.resolve(); const newer = session('A', 'new-session'); put(newer); locked.resolve(remove());
    expect(await pending).toBe('replacement'); expect(request.mock.calls[0][0]).toBe(`lock:${storageKey}`); expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(newer));
  });
  it('removes a rotated access token for the same departing auth session', async () => {
    const current = session(); put(session('A', 'session-1', 2));
    expect(await signOutOwnedSession(current, { backendId, storageKey, storage: localStorage, revoke: async () => ({ error: null }), notify: vi.fn() })).toBe('removed');
  });
  it('leaves the session intact on a real revocation error and tolerates expired/deleted auth responses', async () => {
    const current = session(); put(current); const notify = vi.fn();
    await expect(signOutOwnedSession(current, { backendId, storageKey, storage: localStorage, revoke: async () => ({ error: { status: 500, message: 'retry' } }), notify })).rejects.toThrow('retry');
    expect(localStorage.getItem(storageKey)).not.toBeNull(); expect(notify).not.toHaveBeenCalled();
    for (const status of [401, 403, 404]) { put(current); expect(await signOutOwnedSession(current, { backendId, storageKey, storage: localStorage, revoke: async () => ({ error: { status, message: 'gone' } }), notify })).toBe('removed'); }
  });
  it('fails closed on unknown session bytes and never schedules a generic SDK broadcast', async () => {
    localStorage.setItem(storageKey, 'unknown'); const current = session(); const notify = vi.fn();
    expect(await signOutOwnedSession(current, { backendId, storageKey, storage: localStorage, revoke: async () => ({ error: null }), notify })).toBe('replacement');
    expect(localStorage.getItem(storageKey)).toBe('unknown');
    expect(sameSessionOwner(sessionOwner(backendId, current), sessionOwner(backendId, session('A', 'another')))).toBe(false);
  });
  it('subscribes only to owned custom/native storage events, and cleans up the listener', () => {
    const listener = vi.fn(); const stop = subscribeOwnedSignOut(backendId, storageKey, listener);
    const owner = sessionOwner(backendId, session())!;
    window.dispatchEvent(new CustomEvent(OWNED_SIGN_OUT_EVENT, { detail: { ...owner, backendId: 'other' } }));
    window.dispatchEvent(new CustomEvent('SIGNED_OUT', { detail: owner })); expect(listener).not.toHaveBeenCalled();
    window.dispatchEvent(new CustomEvent(OWNED_SIGN_OUT_EVENT, { detail: owner })); expect(listener).toHaveBeenCalledWith(owner);
    window.dispatchEvent(new StorageEvent('storage', { key: storageKey, oldValue: JSON.stringify(session()), newValue: null, storageArea: localStorage })); expect(listener).toHaveBeenCalledTimes(2);
    stop(); window.dispatchEvent(new CustomEvent(OWNED_SIGN_OUT_EVENT, { detail: owner })); expect(listener).toHaveBeenCalledTimes(2);
  });
});
