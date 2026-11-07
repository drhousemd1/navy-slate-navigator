import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readEncyclopediaDraft, removeEncyclopediaDraft, saveEncyclopediaDraft, type EncyclopediaDraft } from '@/data/encyclopedia/store';
import { markDeletedAccount } from '@/data/accountDeletion/tombstone';
import { backend, scope, draftId, entryId, intent, receipt } from './encyclopedia.helpers';
const draft = (overrides: Partial<EncyclopediaDraft> = {}): EncyclopediaDraft => ({ version: 1, storageRevision: 0, scope, draftId, entryId, expectedRevision: 4, patch: {}, intent: null, receipt: null, rejected: false, rejectionCode: null, ...overrides });
beforeEach(() => localStorage.clear());
describe('scoped durable editorial intent', () => {
  it('keeps incomplete drafts and explicit null/false/zero without adopting other-account or legacy bytes', () => {
    localStorage.setItem('encyclopedia-entries', 'unowned');
    const own = draft({ patch: { titleColor: '#', opacity: 0, highlightEffect: false, popupOpacity: null } }); saveEncyclopediaDraft(own, draftId);
    expect(readEncyclopediaDraft(scope)).toEqual(own); expect(readEncyclopediaDraft({ ...scope, accountId: 'b' })).toBeNull();
    expect(readEncyclopediaDraft({ ...scope, backendId: 'https://other.example' })).toBeNull();
    expect(Object.keys(localStorage).some(key => key.startsWith('obedience-editor-draft:v3:'))).toBe(true);
    removeEncyclopediaDraft(own); expect(localStorage.getItem('encyclopedia-entries')).toBe('unowned');
  });
  it('preserves pending command exactly through reload and blocks replacement/discard until resolved', () => {
    const request = intent(); const pending = draft({ patch: request.patch!, intent: request }); saveEncyclopediaDraft(pending, draftId);
    expect(readEncyclopediaDraft(scope)).toEqual(pending);
    expect(() => saveEncyclopediaDraft({ ...pending, intent: { ...request, commandId: crypto.randomUUID() } }, draftId)).toThrow('DEVICE_STORAGE_CHANGED');
    expect(() => removeEncyclopediaDraft(pending)).toThrow('DEVICE_STORAGE_CHANGED');
    const confirmed = { ...pending, receipt: receipt() }; saveEncyclopediaDraft(confirmed, draftId); removeEncyclopediaDraft(confirmed); expect(readEncyclopediaDraft(scope)).toBeNull();
  });
  it('ignores object insertion order but still rejects changed pending values and array order', () => {
    const request = intent({ patch: { image: { op: 'remove' }, focalPointY: 0, contentDocument: { version: 1, blocks: [
      { type: 'paragraph', children: [{ type: 'text', text: 'first', marks: { fontSize: '2rem', bold: true } }, { type: 'text', text: 'second' }] },
    ] } } });
    const pending = draft({ patch: request.patch!, intent: request }); saveEncyclopediaDraft(pending, draftId);
    const version = pending.storageRevision; saveEncyclopediaDraft(pending, draftId); expect(pending.storageRevision).toBe(version);
    const reordered = readEncyclopediaDraft(scope)!;
    expect(JSON.stringify(reordered.intent)).not.toBe(JSON.stringify(request));
    saveEncyclopediaDraft(reordered, draftId); expect(reordered.storageRevision).toBe(version);
    const different = structuredClone(request); different.patch!.contentDocument!.blocks[0].children.reverse();
    expect(() => saveEncyclopediaDraft({ ...pending, intent: different, patch: different.patch! }, draftId)).toThrow('DEVICE_STORAGE_CHANGED');
    const confirmed = { ...pending, receipt: receipt(request) }; saveEncyclopediaDraft(confirmed, draftId);
    expect(readEncyclopediaDraft(scope)?.receipt).toEqual(receipt(request)); removeEncyclopediaDraft(confirmed);
  });
  it('retains a definite conflict until explicitly reviewed, then permits a new intent', () => {
    const request = intent(); const rejected = draft({ patch: request.patch!, intent: request, rejected: true, rejectionCode: 'ENTRY_REVISION_CONFLICT' });
    saveEncyclopediaDraft(rejected, draftId); expect(readEncyclopediaDraft(scope)?.rejectionCode).toBe('ENTRY_REVISION_CONFLICT');
    const reviewed = { ...rejected, intent: null, rejected: false, rejectionCode: null, expectedRevision: 8 };
    saveEncyclopediaDraft(reviewed, draftId); expect(readEncyclopediaDraft(scope)?.expectedRevision).toBe(8);
  });
  it('does not overwrite a foreign draft, a malformed record, or bytes after a quota failure', () => {
    const own = draft(); saveEncyclopediaDraft(own, draftId);
    expect(() => saveEncyclopediaDraft({ ...own, draftId: crypto.randomUUID() }, null)).toThrow('DEVICE_STORAGE_CHANGED');
    const key = Object.keys(localStorage)[0]; const original = localStorage.getItem(key);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new DOMException('quota', 'QuotaExceededError'); });
    expect(() => saveEncyclopediaDraft({ ...own, patch: { title: 'new' } }, draftId)).toThrow('DEVICE_STORAGE_UNAVAILABLE'); expect(localStorage.getItem(key)).toBe(original);
    localStorage.setItem(key, '{broken'); expect(() => saveEncyclopediaDraft(own, draftId)).toThrow('DEVICE_STORAGE_UNAVAILABLE'); expect(localStorage.getItem(key)).toBe('{broken');
  });
  it('rejects a stale same-draft tab and late recreation after another tab discards', () => {
    const first = draft(); saveEncyclopediaDraft(first, draftId);
    const second = readEncyclopediaDraft(scope)!;
    const newer = { ...first, patch: { title: 'Newer saved text' } }; saveEncyclopediaDraft(newer, draftId);
    expect(() => saveEncyclopediaDraft({ ...second, patch: { title: 'Stale tab text' } }, draftId)).toThrow('DEVICE_STORAGE_CHANGED');
    expect(readEncyclopediaDraft(scope)?.patch.title).toBe('Newer saved text');
    removeEncyclopediaDraft(newer);
    expect(() => saveEncyclopediaDraft(second, draftId)).toThrow('DEVICE_STORAGE_CHANGED');
  });
  it('rejects late deleted-account writes without affecting another account', () => {
    markDeletedAccount(backend, scope.accountId); expect(() => saveEncyclopediaDraft(draft(), draftId)).toThrow('deleted');
    const b = draft({ scope: { ...scope, accountId: 'b' } }); saveEncyclopediaDraft(b, draftId); expect(readEncyclopediaDraft(b.scope)).toEqual(b);
  });
});
