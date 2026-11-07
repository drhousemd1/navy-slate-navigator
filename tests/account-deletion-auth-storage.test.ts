import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { deletionAwareAuthStorage, removeDeletedAccountSession } from '@/data/accountDeletion/authStorage';
import { markDeletedAccount } from '@/data/accountDeletion/tombstone';
import { id, scope } from './account-deletion.helpers';
const key = 'sb-deletion-auth-token';
const session = (account = scope.accountId) => JSON.stringify({ user: { id: account }, access_token: 'mock-access', refresh_token: 'mock-refresh', expires_in: 3600, expires_at: 4294967295, token_type: 'bearer' });
beforeEach(() => localStorage.clear()); afterEach(() => vi.useRealTimers());
describe('deletion-only Supabase session storage', () => {
  it('uses the installed SDK lock name and checks actual owner inside the lock after a switch', async () => {
    markDeletedAccount(scope.backendId, scope.accountId); localStorage.setItem(key, session());
    let execute!: () => string; const request = vi.fn((_name, _options, callback) => new Promise(resolve => { execute = () => { const result = callback(); resolve(result); return result; }; }));
    const clearing = removeDeletedAccountSession(scope.backendId, key, scope.accountId, localStorage, { request } as unknown as LockManager);
    expect(request.mock.calls[0][0]).toBe(`lock:${key}`); expect(request.mock.calls[0][1].mode).toBe('exclusive');
    localStorage.setItem(key, session(id(90))); execute(); expect(await clearing).toBe('other_account'); expect(localStorage.getItem(key)).toBe(session(id(90)));
  });
  it('removes only an exactly owned session and preserves verifier/other backend bytes', async () => {
    markDeletedAccount(scope.backendId, scope.accountId); localStorage.setItem(key, session()); localStorage.setItem(`${key}-code-verifier`, 'unattributable'); localStorage.setItem('sb-other-auth-token', session());
    expect(await removeDeletedAccountSession(scope.backendId, key, scope.accountId, localStorage, undefined)).toBe('removed');
    expect(localStorage.getItem(`${key}-code-verifier`)).toBe('unattributable'); expect(localStorage.getItem('sb-other-auth-token')).toBe(session());
  });
  it('does not delete malformed ownership or clear a session without server-completion tombstone', async () => {
    localStorage.setItem(key, session()); await expect(removeDeletedAccountSession(scope.backendId, key, scope.accountId)).rejects.toThrow('not confirmed');
    markDeletedAccount(scope.backendId, scope.accountId); localStorage.setItem(key, '{broken'); await expect(removeDeletedAccountSession(scope.backendId, key, scope.accountId)).rejects.toThrow('ownership'); expect(localStorage.getItem(key)).toBe('{broken');
  });
  it('has a bounded lock wait and cannot perform a late removal after timeout', async () => {
    vi.useFakeTimers(); markDeletedAccount(scope.backendId, scope.accountId); localStorage.setItem(key, session()); let callback!: () => unknown;
    const request = vi.fn((_name, _options, run) => { callback = run; return new Promise(() => {}); });
    const clearing = removeDeletedAccountSession(scope.backendId, key, scope.accountId, localStorage, { request } as unknown as LockManager);
    const rejected = expect(clearing).rejects.toThrow('another attempt'); await vi.advanceTimersByTimeAsync(5001); await rejected;
    expect(() => callback()).toThrow('another attempt'); expect(localStorage.getItem(key)).toBe(session());
  });
  it('blocks a late deleted-account session write but preserves ordinary other-account storage behavior', () => {
    const storage = deletionAwareAuthStorage(scope.backendId, key, localStorage); storage.setItem(key, session()); markDeletedAccount(scope.backendId, scope.accountId);
    expect(storage.getItem(key)).toBeNull(); expect(() => storage.setItem(key, session())).toThrow('deleted');
    storage.setItem(key, session(id(90))); expect(storage.getItem(key)).toBe(session(id(90))); storage.removeItem(key); expect(localStorage.getItem(key)).toBeNull();
  });
  it('the installed SDK reads the guarded storage after deletion without SDK signOut or network traffic', async () => {
    const storageKey = `${key}-sdk-test`; const storage = deletionAwareAuthStorage(scope.backendId, storageKey, localStorage); storage.setItem(storageKey, session()); const fetch = vi.fn();
    const client = createClient(scope.backendId, 'public-test', { auth: { storageKey, storage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch } });
    expect((await client.auth.getSession()).data.session?.user.id).toBe(scope.accountId);
    markDeletedAccount(scope.backendId, scope.accountId); await removeDeletedAccountSession(scope.backendId, storageKey, scope.accountId, localStorage, undefined);
    expect((await client.auth.getSession()).data.session).toBeNull(); expect(fetch).not.toHaveBeenCalled();
    storage.setItem(storageKey, session(id(90))); expect((await client.auth.getSession()).data.session?.user.id).toBe(id(90)); await client.auth.stopAutoRefresh();
  });
});
