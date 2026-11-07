import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://example.supabase.co', supabasePublicKey: 'public-key', supabase: { auth: { getSession: vi.fn() } } }));
import { createEncyclopediaTransport } from '@/data/encyclopedia/api';
import { backend, scope, intent, receipt, entry, deferred } from './encyclopedia.helpers';
const session = vi.fn(); const read = vi.fn(); const fetcher = vi.fn();
const make = (timeoutMs = 30) => createEncyclopediaTransport({ backendId: backend, publicKey: 'public-key', session, read, fetch: fetcher, timeoutMs });
beforeEach(() => { session.mockReset().mockResolvedValue({ accountId: scope.accountId, token: 'captured-token' }); read.mockReset().mockResolvedValue({ data: { canEdit: true, entries: [entry()] }, error: null }); fetcher.mockReset().mockResolvedValue(Response.json(receipt())); });
afterEach(() => vi.useRealTimers());
describe('account-bound Encyclopedia transport', () => {
  it('reads server capability with captured auth and returns nullable legacy fields intact', async () => {
    expect(await make().read(scope)).toEqual({ canEdit: true, entries: [entry()] });
    expect(read).toHaveBeenCalledWith('captured-token', expect.any(AbortSignal)); expect(session).toHaveBeenCalledTimes(2);
  });
  it('sends the exact stable intent without an invented kind field and verifies the receipt', async () => {
    const request = intent({ patch: { opacity: 0, highlightEffect: false, titleColor: null } });
    expect(await make().write(scope, request)).toEqual(receipt(request));
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe(`${backend}/functions/v1/encyclopedia-admin/save`);
    expect(options.headers).toEqual({ Authorization: 'Bearer captured-token', apikey: 'public-key', 'Content-Type': 'application/json' });
    expect(JSON.parse(options.body)).toEqual({ commandId: request.commandId, entryId: request.entryId, expectedRevision: 4, patch: request.patch });
  });
  it('rejects an oversized published document before auth or transmission', () => {
    const children = new Array(4096);
    const readItem = vi.fn(() => { throw new Error('Oversized input was traversed'); });
    Object.defineProperty(children, 0, { get: readItem });
    expect(() => make().write(scope, intent({ patch: { contentDocument: { version: 1, blocks: [{ type: 'paragraph', children }] } } }))).toThrow('This article is too large.');
    expect(readItem).not.toHaveBeenCalled(); expect(session).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
  it('deletes using the same revision contract and no patch', async () => {
    const request = intent({ kind: 'delete', patch: undefined }); fetcher.mockResolvedValue(Response.json(receipt(request)));
    expect(await make().write(scope, request)).toEqual(receipt(request));
    expect(fetcher.mock.calls[0][0]).toContain('/delete'); expect(JSON.parse(fetcher.mock.calls[0][1].body)).not.toHaveProperty('patch');
  });
  it.each([{}, { ...receipt(), entryId: '10000000-0000-4000-8000-000000000002' }, { ...receipt(), revision: 99 }, { ...receipt(), deleted: true }])('rejects a malformed or mismatched success instead of claiming completion', async result => {
    fetcher.mockResolvedValue(Response.json(result)); await expect(make().write(scope, intent())).rejects.toThrow();
  });
  it('keeps unknown failures uncertain and recognizes explicit revision rejection without exposing raw messages', async () => {
    fetcher.mockResolvedValueOnce(Response.json({ error: { code: 'ENTRY_REVISION_CONFLICT', message: 'private details' } }, { status: 409 }));
    await expect(make().write(scope, intent())).rejects.toMatchObject({ code: 'ENTRY_REVISION_CONFLICT', definite: true, message: 'ENTRY_REVISION_CONFLICT' });
    fetcher.mockResolvedValueOnce(Response.json({ error: { code: 'INTERNAL', message: 'private details' } }, { status: 503 }));
    await expect(make().write(scope, intent())).rejects.toMatchObject({ definite: false });
  });
  it('does not read/send to a wrong backend/account and rejects a response after the SDK account changes', async () => {
    await expect(make().read({ ...scope, backendId: 'https://other.example' })).rejects.toThrow('ACCOUNT_CHANGED');
    session.mockResolvedValueOnce({ accountId: 'account-b', token: 'b' }); await expect(make().write(scope, intent())).rejects.toThrow('ACCOUNT_CHANGED');
    expect(fetcher).not.toHaveBeenCalled();
    session.mockResolvedValueOnce({ accountId: scope.accountId, token: 'a' }).mockResolvedValueOnce({ accountId: 'account-b', token: 'b' });
    await expect(make().write(scope, intent())).rejects.toThrow('ACCOUNT_CHANGED');
  });
  it('bounds the whole operation including a hung auth lookup, with no late send', async () => {
    vi.useFakeTimers(); const auth = deferred<{ accountId: string; token: string }>(); session.mockReturnValueOnce(auth.promise);
    const outcome = make().write(scope, intent()).catch(error => error); await vi.advanceTimersByTimeAsync(30);
    expect(await outcome).toMatchObject({ code: 'UNCONFIRMED' }); auth.resolve({ accountId: scope.accountId, token: 'late' }); await Promise.resolve();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('bounds a lost response/body and caller cancellation', async () => {
    vi.useFakeTimers(); fetcher.mockResolvedValue({ ok: true, json: () => new Promise(() => {}) });
    const outcome = make().write(scope, intent()).catch(error => error); await vi.advanceTimersByTimeAsync(30); expect(await outcome).toMatchObject({ code: 'UNCONFIRMED' });
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    const controller = new AbortController(); controller.abort(); await expect(make().read(scope, controller.signal)).rejects.toThrow('CANCELLED');
  });
});
