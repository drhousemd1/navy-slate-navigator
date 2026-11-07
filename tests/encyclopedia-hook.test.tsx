import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: { user: { id: 'account-a' } as { id: string } | null, loading: false }, read: vi.fn(), write: vi.fn() }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://example.supabase.co' }));
vi.mock('@/data/encyclopedia/api', async () => ({ ...await import('@/data/encyclopedia/errors'), encyclopediaTransport: { read: mocks.read, write: mocks.write } }));
import { useEncyclopedia } from '@/hooks/useEncyclopedia';
import { EncyclopediaError } from '@/data/encyclopedia/errors';
import { readEncyclopediaDraft, saveEncyclopediaDraft } from '@/data/encyclopedia/store';
import { scope, entry, receipt, deferred, intent, draftId } from './encyclopedia.helpers';
import type { EncyclopediaIntent, EncyclopediaLibrary, EncyclopediaReceipt } from '@/types/encyclopedia';
const clients: QueryClient[] = [];
function setup() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
  return renderHook(useEncyclopedia, { wrapper: ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider> }); }
beforeEach(() => { localStorage.clear(); mocks.auth = { user: { id: 'account-a' }, loading: false };
  mocks.read.mockReset().mockResolvedValue({ canEdit: true, entries: [entry()] }); mocks.write.mockReset().mockImplementation(async (_scope, request) => receipt(request)); });
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); clients.length = 0; });
const ready = async (hook: ReturnType<typeof setup>) => waitFor(() => expect(hook.result.current.canEdit).toBe(true));
describe('durable Encyclopedia editor orchestration', () => {
  it('saves only explicitly changed fields, retains legacy body/image, and confirms only after refresh', async () => {
    const hook = setup(); await ready(hook);
    act(() => hook.result.current.begin(entry())); act(() => hook.result.current.change({ subtext: 'Edited description', opacity: 0, highlightEffect: false }));
    await act(async () => hook.result.current.submit());
    const request = mocks.write.mock.calls[0][1];
    expect(request).toMatchObject({ expectedRevision: 4, patch: { subtext: 'Edited description', opacity: 0, highlightEffect: false } });
    expect(request.patch).not.toHaveProperty('contentDocument'); expect(request.patch).not.toHaveProperty('image');
    expect(hook.result.current.editor.draft).toBeNull(); expect(hook.result.current.editor.notice).toBe('Entry saved.');
    expect(readEncyclopediaDraft(scope)).toBeNull(); expect(mocks.read).toHaveBeenCalledTimes(2);
  });
  it('confirms and cleans up a single-tab rich edit whose field insertion order differs from schema order', async () => {
    const hook = setup(); await ready(hook); act(() => hook.result.current.begin(entry()));
    act(() => hook.result.current.change({ title: 'Saved rich article' }));
    act(() => hook.result.current.change({ contentDocument: { version: 1, blocks: [
      { type: 'paragraph', children: [{ type: 'text', text: 'Bold article', marks: { fontSize: '2rem', bold: true } }] },
      { type: 'paragraph', children: [{ type: 'text', text: 'Literal <reference>' }] },
    ] } }));
    act(() => hook.result.current.change({ image: { op: 'replace', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' } }));
    act(() => hook.result.current.change({ focalPointX: 0, focalPointY: 100, popupOpacity: 0 }));
    act(() => hook.result.current.change({ titleColor: null, subtextColor: null }));
    await act(async () => hook.result.current.submit());
    expect(mocks.write).toHaveBeenCalledTimes(1);
    expect(hook.result.current.editor.error).toBeNull(); expect(hook.result.current.editor.draft).toBeNull();
    expect(hook.result.current.editor.notice).toBe('Entry saved.'); expect(readEncyclopediaDraft(scope)).toBeNull();
  });
  it('keeps unknown outcomes immutable and retries the same exact command/entry after reload', async () => {
    mocks.write.mockRejectedValueOnce(new EncyclopediaError('UNCONFIRMED'));
    const hook = setup(); await ready(hook); act(() => hook.result.current.begin()); act(() => hook.result.current.change({ title: 'New article' }));
    await act(async () => hook.result.current.submit());
    const request = mocks.write.mock.calls[0][1]; expect(readEncyclopediaDraft(scope)?.intent).toEqual(request);
    act(() => hook.result.current.change({ title: 'Should not change pending request' })); act(() => hook.result.current.discard());
    expect(hook.result.current.editor.draft?.patch.title).toBe('New article'); hook.unmount();
    mocks.write.mockImplementation(async (_scope, retry) => receipt(retry, true));
    const reopened = setup(); await ready(reopened); expect(reopened.result.current.editor.open).toBe(false);
    act(() => reopened.result.current.resume()); await act(async () => reopened.result.current.submit());
    expect(mocks.write.mock.calls[1][1]).toEqual(request); expect(reopened.result.current.editor.notice).toContain('Earlier editorial request confirmed');
  });
  it('never sends an intent if durable storage fails; visible draft remains editable', async () => {
    const hook = setup(); await ready(hook); act(() => hook.result.current.begin()); act(() => hook.result.current.change({ title: 'Keep me' }));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('QuotaExceededError'); });
    await act(async () => hook.result.current.submit()); expect(mocks.write).not.toHaveBeenCalled();
    expect(hook.result.current.editor.storageError).toContain('5 MB image limit'); expect(hook.result.current.editor.draft?.patch.title).toBe('Keep me');
  });
  it('keeps an invalid partial color draft across cancel/reload, but does not submit it', async () => {
    const hook = setup(); await ready(hook); act(() => hook.result.current.begin(entry())); act(() => hook.result.current.change({ titleColor: '#' }));
    act(() => hook.result.current.close()); expect(readEncyclopediaDraft(scope)?.patch.titleColor).toBe('#'); hook.unmount();
    const reopened = setup(); await ready(reopened); await act(async () => reopened.result.current.submit()); expect(mocks.write).not.toHaveBeenCalled();
    act(() => reopened.result.current.change({ titleColor: '#ABCDEF' })); await act(async () => reopened.result.current.submit()); expect(mocks.write).toHaveBeenCalledTimes(1);
  });
  it('requires explicit revision review before a new command and preserves the draft changes', async () => {
    mocks.write.mockRejectedValueOnce(new EncyclopediaError('ENTRY_REVISION_CONFLICT', true));
    const hook = setup(); await ready(hook); act(() => hook.result.current.begin(entry())); act(() => hook.result.current.change({ title: 'My title' }));
    await act(async () => hook.result.current.submit()); const original = mocks.write.mock.calls[0][1];
    await act(async () => hook.result.current.submit()); expect(mocks.write).toHaveBeenCalledTimes(1);
    expect(readEncyclopediaDraft(scope)?.rejectionCode).toBe('ENTRY_REVISION_CONFLICT');
    mocks.read.mockResolvedValue({ canEdit: true, entries: [entry({ revision: 8, title: 'Other edit' })] });
    await act(async () => hook.result.current.reviewLatest()); expect(hook.result.current.editor.draft).toMatchObject({ expectedRevision: 8, patch: { title: 'My title' }, intent: null });
    expect(mocks.write).toHaveBeenCalledTimes(1); await act(async () => hook.result.current.submit());
    expect(mocks.write.mock.calls[1][1].commandId).not.toBe(original.commandId); expect(mocks.write.mock.calls[1][1].expectedRevision).toBe(8);
  });
  it('persists a receipt when refresh fails, then retries only the read even if capability is temporarily unknown', async () => {
    const hook = setup(); await ready(hook); act(() => hook.result.current.begin(entry())); act(() => hook.result.current.change({ title: 'Save' }));
    mocks.read.mockRejectedValueOnce(new Error('offline')); await act(async () => hook.result.current.submit());
    expect(readEncyclopediaDraft(scope)?.receipt).toBeTruthy(); expect(hook.result.current.editor.error).toContain('will not be sent again');
    expect(hook.result.current.canEdit).toBe(false); await act(async () => hook.result.current.submit());
    expect(mocks.write).toHaveBeenCalledTimes(1); expect(hook.result.current.editor.draft).toBeNull();
  });
  it.each([true, false])('recovers a reloaded rich request with confirmed receipt=%s despite normalized object key order', async confirmed => {
    const request = intent({ patch: { image: { op: 'replace', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
      titleColor: null, focalPointX: 0, contentDocument: { blocks: [{ children: [{ marks: { fontSize: '2rem', bold: true }, text: 'Literal <reference>', type: 'text' }], type: 'paragraph' }], version: 1 } } });
    saveEncyclopediaDraft({ version: 1, storageRevision: 0, scope, draftId, entryId: request.entryId, expectedRevision: request.expectedRevision,
      patch: request.patch!, intent: request, receipt: confirmed ? receipt(request) : null, rejected: false, rejectionCode: null }, draftId);
    expect(JSON.stringify(readEncyclopediaDraft(scope)?.intent)).not.toBe(JSON.stringify(request));
    mocks.write.mockImplementation(async (_scope, replay) => receipt(replay, true));
    const hook = setup(); await ready(hook); expect(mocks.write).not.toHaveBeenCalled();
    act(() => hook.result.current.resume()); await act(async () => hook.result.current.submit());
    if (confirmed) expect(mocks.write).not.toHaveBeenCalled();
    else { expect(mocks.write).toHaveBeenCalledTimes(1); expect(mocks.write.mock.calls[0][1]).toEqual(request); }
    expect(hook.result.current.editor.error).toBeNull(); expect(hook.result.current.editor.draft).toBeNull(); expect(readEncyclopediaDraft(scope)).toBeNull();
  });
  it('distinguishes receipt storage failure from refresh failure and finishes without resending the confirmed request', async () => {
    const hook = setup(); await ready(hook); act(() => hook.result.current.begin(entry()));
    act(() => hook.result.current.change({ title: 'Keep confirmation' }));
    const original = Storage.prototype.setItem; let failReceipt = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key.startsWith('obedience-editor-draft:v3:') && JSON.parse(value).receipt && failReceipt) throw new DOMException('quota');
      original.call(this, key, value);
    });
    await act(async () => hook.result.current.submit());
    expect(hook.result.current.editor.error).toContain('confirmation could not be saved on this device');
    expect(hook.result.current.editor.error).not.toContain('library could not be refreshed');
    expect(mocks.read).toHaveBeenCalledTimes(1); expect(readEncyclopediaDraft(scope)?.receipt).toBeNull();
    failReceipt = false; await act(async () => hook.result.current.submit());
    expect(mocks.write).toHaveBeenCalledTimes(1); expect(hook.result.current.editor.draft).toBeNull(); expect(readEncyclopediaDraft(scope)).toBeNull();
  });
  it('distinguishes local draft cleanup failure after successful refresh and retries without another mutation', async () => {
    const hook = setup(); await ready(hook); act(() => hook.result.current.begin(entry()));
    const original = Storage.prototype.removeItem; let failCleanup = true;
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (key) {
      if (key.startsWith('obedience-editor-draft:v3:') && failCleanup) throw new DOMException('storage unavailable');
      original.call(this, key);
    });
    await act(async () => hook.result.current.submit());
    expect(hook.result.current.editor.error).toContain('library was refreshed, but the saved draft could not be cleared');
    expect(mocks.read).toHaveBeenCalledTimes(2); expect(readEncyclopediaDraft(scope)?.receipt).toBeTruthy();
    failCleanup = false; await act(async () => hook.result.current.submit());
    expect(mocks.write).toHaveBeenCalledTimes(1); expect(readEncyclopediaDraft(scope)).toBeNull();
  });
  it('does not expose authoring to ordinary users and loses it when current server capability is revoked', async () => {
    mocks.read.mockResolvedValueOnce({ canEdit: false, entries: [entry()] }); const hook = setup();
    await waitFor(() => expect(hook.result.current.entries).toHaveLength(1)); act(() => hook.result.current.begin(entry()));
    expect(hook.result.current.editor.draft).toBeNull(); await act(async () => hook.result.current.refetch()); await ready(hook);
    act(() => hook.result.current.begin(entry())); act(() => hook.result.current.change({ title: 'Retain' }));
    mocks.write.mockRejectedValueOnce(new EncyclopediaError('EDITOR_REQUIRED')); mocks.read.mockResolvedValue({ canEdit: false, entries: [entry()] });
    await act(async () => hook.result.current.submit()); await waitFor(() => expect(hook.result.current.canEdit).toBe(false));
    expect(hook.result.current.editor.draft?.patch.title).toBe('Retain'); await act(async () => hook.result.current.submit()); expect(mocks.write).toHaveBeenCalledTimes(1);
  });
  it('fences A to B to A responses, preserves exact own pending intent, and never flashes another account capability/draft', async () => {
    const old = deferred<EncyclopediaReceipt>(); mocks.write.mockReturnValueOnce(old.promise);
    const hook = setup(); await ready(hook); act(() => hook.result.current.begin(entry())); act(() => hook.result.current.change({ title: 'A draft' }));
    let pending!: Promise<void>; act(() => { pending = hook.result.current.submit(); }); await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(1));
    const b = deferred<EncyclopediaLibrary>(); mocks.read.mockReturnValueOnce(b.promise); mocks.auth.user = { id: 'account-b' }; hook.rerender();
    expect(hook.result.current.editor.draft).toBeNull(); expect(hook.result.current.canEdit).toBe(false); expect(hook.result.current.entries).toEqual([]);
    expect(mocks.write.mock.calls[0][2].aborted).toBe(true); await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(2));
    mocks.auth.user = { id: 'account-a' }; hook.rerender(); await ready(hook); expect(hook.result.current.editor.draft?.patch.title).toBe('A draft');
    await act(async () => { old.resolve(receipt(mocks.write.mock.calls[0][1] as EncyclopediaIntent)); b.resolve({ canEdit: true, entries: [entry({ title: 'B response' })] }); await pending; });
    expect(hook.result.current.editor.notice).toBeNull(); expect(hook.result.current.editor.draft?.receipt).toBeNull(); expect(hook.result.current.entries[0].title).toBe('Reference article');
    expect(readEncyclopediaDraft({ ...scope, accountId: 'account-b' })).toBeNull();
  });
  it('aborts on unmount and recovers a request whose late response was discarded', async () => {
    const old = deferred<EncyclopediaReceipt>(); mocks.write.mockReturnValueOnce(old.promise);
    const hook = setup(); await ready(hook); act(() => hook.result.current.begin(entry())); let pending!: Promise<void>;
    act(() => { pending = hook.result.current.submit('delete'); }); await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(1));
    const request = mocks.write.mock.calls[0][1]; hook.unmount(); expect(mocks.write.mock.calls[0][2].aborted).toBe(true);
    await act(async () => { old.resolve(receipt(request)); await pending; }); expect(readEncyclopediaDraft(scope)?.intent).toEqual(request);
    const reopened = setup(); await ready(reopened); await act(async () => reopened.result.current.submit());
    expect(mocks.write.mock.calls[1][1]).toEqual(request); expect(reopened.result.current.editor.notice).toBe('Entry deleted.');
  });
});
