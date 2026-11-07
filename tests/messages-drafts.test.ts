import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://backend.invalid', supabase: { auth: { getSession: vi.fn() } } }));
import { MessageDraftSession, draftKey, createDraftRepository } from '@/data/messages/drafts';
import { MessageRequestError } from '@/data/messages/transport';
import { apiFixture, conversation, deferred, flush, receipt, repositoryFixture, scope, uuid } from './messages.helpers';

async function fixture() {
  const { rows, repo } = repositoryFixture(); const api = apiFixture(); const confirmed = vi.fn();
  const session = new MessageDraftSession(scope, conversation.id, repo, api, confirmed); await session.load();
  return { rows, repo, api, confirmed, session };
}
describe('durable message drafts', () => {
  it('scopes drafts by backend/account/period/generation/conversation and retains Blob edits through remount', async () => {
    const f = await fixture(); const blob = new Blob(['abc'], { type: 'image/png' });
    f.session.edit({ text: 'first' }); f.session.edit({ text: 'last', image: blob, imageName: 'photo.png' }); await flush();
    const next = new MessageDraftSession(scope, conversation.id, f.repo, f.api, f.confirmed); await next.load();
    expect(next.getSnapshot().draft).toMatchObject({ text: 'last', image: blob, imageName: 'photo.png' });
    for (const change of [{ accountId: uuid(20) }, { relationshipId: uuid(21) }, { relationshipSessionId: uuid(22) }, { backendId: 'https://other.invalid' }]) expect(draftKey({ ...scope, ...change }, conversation.id)).not.toBe(draftKey(scope, conversation.id));
    expect(draftKey(scope, uuid(23))).not.toBe(draftKey(scope, conversation.id));
  });
  it('does not send text alone when the selected image upload fails', async () => {
    const f = await fixture(); f.session.edit({ text: 'with image', image: new Blob(['abc'], { type: 'image/png' }), imageName: 'photo.png' });
    f.api.upload.mockRejectedValue(new Error('Image unavailable')); await f.session.send();
    expect(f.api.send).not.toHaveBeenCalled(); expect(f.session.getSnapshot().draft).toMatchObject({ text: 'with image', status: 'editing' }); expect(f.session.getSnapshot().draft.image).not.toBeNull();
  });
  it('keeps one immutable request through unknown status and duplicate submit, then clears only on confirmed receipt', async () => {
    const f = await fixture(); f.session.edit({ text: 'keep me' }); const pending = deferred<ReturnType<typeof receipt>>();
    f.api.send.mockReturnValue(pending.promise); const sending = f.session.send(); await flush(); await f.session.send();
    expect(f.api.send).toHaveBeenCalledTimes(1); expect(f.session.getSnapshot().draft.text).toBe('keep me');
    const original = f.api.send.mock.calls[0][1]; pending.reject(new MessageRequestError('unknown', 'Unconfirmed')); await sending;
    f.session.edit({ text: 'must not replace uncertain intent' }); expect(f.session.getSnapshot().draft.text).toBe('keep me');
    f.api.send.mockImplementation(async (_scope, intent) => receipt(intent.commandId)); await f.session.send();
    expect(f.api.send.mock.calls[1][1]).toEqual(original); expect(f.rows.size).toBe(0); expect(f.session.getSnapshot().draft.text).toBe(''); expect(f.confirmed).toHaveBeenCalledOnce();
  });
  it('known rejection requires an explicit new intent before editing and never invents a successful send', async () => {
    const f = await fixture(); f.session.edit({ text: 'before' }); const original = f.session.getSnapshot().draft.commandId;
    f.api.send.mockRejectedValue(new MessageRequestError('rejected', 'Read-only')); await f.session.send(); f.session.edit({ text: 'ignored' });
    expect(f.session.getSnapshot().draft.text).toBe('before'); expect(f.confirmed).not.toHaveBeenCalled();
    await f.session.newIntent(); f.session.edit({ text: 'after' }); expect(f.session.getSnapshot().draft.commandId).not.toBe(original); expect(f.session.getSnapshot().draft.text).toBe('after');
  });
  it('does not write if durable intent persistence fails; no saved unreadable draft is overwritten', async () => {
    const f = await fixture(); f.session.edit({ text: 'only in memory' }); await flush(); vi.mocked(f.repo.put).mockRejectedValue(new Error('Storage full'));
    await f.session.send(); expect(f.api.send).not.toHaveBeenCalled(); expect(f.session.getSnapshot().draft.text).toBe('only in memory'); expect(f.session.getSnapshot().storageError).toBeTruthy();
    vi.mocked(f.repo.get).mockRejectedValue(new Error('Unreadable saved draft'));
    const next = new MessageDraftSession(scope, conversation.id, f.repo, f.api, f.confirmed); await next.load(); vi.mocked(f.repo.put).mockClear(); next.edit({ text: 'overwrite' }); await flush(); expect(f.repo.put).not.toHaveBeenCalled(); expect(next.getSnapshot().ready).toBe(false);
  });
  it('late confirmation clears only its original scope after switching to another connection', async () => {
    const f = await fixture(); f.session.edit({ text: 'old connection' }); const pending = deferred<ReturnType<typeof receipt>>(); f.api.send.mockReturnValue(pending.promise);
    const sending = f.session.send(); await flush(); const original = f.session.getSnapshot().draft;
    const nextScope = { ...scope, relationshipSessionId: uuid(99) }; const next = new MessageDraftSession(nextScope, conversation.id, f.repo, f.api, vi.fn()); await next.load(); next.edit({ text: 'new connection' }); await flush();
    pending.resolve(receipt(original.commandId)); await sending;
    expect(f.rows.has(original.key)).toBe(false); expect(f.rows.get(draftKey(nextScope, conversation.id))?.text).toBe('new connection');
  });
  it('a remounted sending draft becomes unknown and does not send automatically', async () => {
    const f = await fixture(); const draft = { ...f.session.getSnapshot().draft, text: 'pending', status: 'sending' as const }; await f.repo.put(draft);
    const next = new MessageDraftSession(scope, conversation.id, f.repo, f.api, f.confirmed); await next.load();
    expect(next.getSnapshot().draft.status).toBe('unknown'); expect(f.api.send).not.toHaveBeenCalled();
    f.api.receipt.mockResolvedValue(receipt(draft.commandId)); await next.checkDelivery(); expect(f.rows.size).toBe(0); expect(f.api.send).not.toHaveBeenCalled();
  });
  it('unavailable IndexedDB produces a recoverable storage error rather than a render crash', async () => {
    await expect(createDraftRepository(undefined).get('key')).rejects.toThrow('storage');
  });
});
