import { messageScopeKey, type MessageReceipt, type MessageScope } from './types';
import { MessageRequestError, type MessageTransport } from './transport';
import { requireUndeletedAccount } from '@/data/accountDeletion/tombstone';

export interface MessageDraft {
  version: 1; key: string; scope: MessageScope; conversationId: string;
  text: string; image: Blob | null; imageName: string | null;
  commandId: string; uploadId: string; attachmentId: string | null;
  status: 'editing' | 'sending' | 'unknown' | 'rejected' | 'confirmed';
  receipt: MessageReceipt | null; updatedAt: number;
}
export const draftKey = (scope: MessageScope, conversationId: string) => JSON.stringify(['message-draft-v1', messageScopeKey(scope), conversationId]);
export function emptyMessageDraft(scope: MessageScope, conversationId: string): MessageDraft {
  return { version: 1, key: draftKey(scope, conversationId), scope, conversationId, text: '', image: null, imageName: null,
    commandId: crypto.randomUUID(), uploadId: crypto.randomUUID(), attachmentId: null, status: 'editing', receipt: null, updatedAt: Date.now() };
}
export interface DraftRepository {
  get(key: string): Promise<MessageDraft | null>;
  put(draft: MessageDraft): Promise<void>;
  remove(key: string): Promise<void>;
  list(accountId: string, backendId: string): Promise<MessageDraft[]>;
}
function validDraft(value: unknown): value is MessageDraft {
  const row = value as MessageDraft;
  const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  return !!row && row.version === 1 && typeof row.scope?.backendId === 'string' && uuid(row.scope.accountId) && uuid(row.scope.relationshipId) && uuid(row.scope.relationshipSessionId) &&
    typeof row.conversationId === 'string' && row.key === draftKey(row.scope, row.conversationId) && typeof row.text === 'string' &&
    (row.image === null || row.image instanceof Blob) && uuid(row.commandId) && uuid(row.uploadId) && uuid(row.conversationId) &&
    (row.attachmentId === null || uuid(row.attachmentId)) && (row.imageName === null || typeof row.imageName === 'string') && Number.isFinite(row.updatedAt) &&
    ['editing', 'sending', 'unknown', 'rejected', 'confirmed'].includes(row.status);
}
/** A separate draft store, not a scheduler: nothing sends automatically. Blobs
 * are structured-cloned by IndexedDB, never expanded into localStorage strings. */
export function createDraftRepository(factory: IDBFactory | undefined = globalThis.indexedDB): DraftRepository {
  let opening: Promise<IDBDatabase> | null = null;
  const open = () => opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    if (!factory) { reject(new Error('Draft storage is unavailable in this browser. Your saved drafts have not been overwritten.')); return; }
    const request = factory.open('obedience-message-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'key' });
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); opening = null; }; resolve(request.result); };
    request.onerror = () => { opening = null; reject(new Error('Draft storage could not be opened.')); };
    request.onblocked = () => { opening = null; reject(new Error('Draft storage is blocked. Close other app tabs and retry.')); };
  }).catch(error => { opening = null; throw error; });
  async function transaction<T>(mode: IDBTransactionMode, perform: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction('drafts', mode); const request = perform(tx.objectStore('drafts'));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () => reject(new Error('The message draft could not be saved on this device.'));
    });
  }
  return {
    get: async key => { const row = await transaction('readonly', store => store.get(key)); if (row === undefined) return null; if (!validDraft(row)) throw new Error('The saved draft could not be read. It has not been overwritten.'); return row; },
    put: async draft => { if (!validDraft(draft)) throw new Error('Invalid message draft.'); await transaction('readwrite', store => { requireUndeletedAccount(draft.scope.backendId, draft.scope.accountId); return store.put(draft); }); },
    remove: async key => { await transaction('readwrite', store => store.delete(key)); },
    list: async (accountId, backendId) => {
      const rows = await transaction('readonly', store => store.getAll());
      return rows.filter(row => validDraft(row) && row.scope.accountId === accountId && row.scope.backendId === backendId);
    },
  };
}
let repository: DraftRepository | null = null;
export function messageDraftRepository() { return repository ??= createDraftRepository(); }

export interface DraftState { draft: MessageDraft; ready: boolean; busy: boolean; storageError: string | null; deliveryError: string | null }
/** Lives independently of the mounted composer so a late receipt only updates
 * the original scoped draft. No automatic send/retry occurs on mount. */
export class MessageDraftSession {
  private state: DraftState;
  private listeners = new Set<() => void>();
  private saving: Promise<void> = Promise.resolve();
  private loadSequence = 0;
  constructor(scope: MessageScope, conversationId: string, private repo: DraftRepository, private api: MessageTransport, private confirmed: () => void) {
    this.state = { draft: emptyMessageDraft(scope, conversationId), ready: false, busy: false, storageError: null, deliveryError: null };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private update(patch: Partial<DraftState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()); }
  private persist(draft: MessageDraft): Promise<void> {
    // Each edit captures its own value; writes finish in order through unmount.
    const operation = this.saving.catch(() => {}).then(() => this.repo.put(draft));
    this.saving = operation;
    return operation;
  }
  load = async () => {
    const sequence = ++this.loadSequence;
    try {
      const draft = await this.repo.get(this.state.draft.key);
      if (sequence !== this.loadSequence) return;
      this.update({ draft: draft ? { ...draft, status: draft.status === 'sending' ? 'unknown' : draft.status } : this.state.draft, ready: true, storageError: null });
    } catch (error) { if (sequence === this.loadSequence) this.update({ ready: false, storageError: error instanceof Error ? error.message : 'The saved draft could not be read. It has not been overwritten.' }); }
  };
  edit = (patch: { text?: string; image?: Blob | null; imageName?: string | null }) => {
    if (!this.state.ready || this.state.busy || this.state.draft.status !== 'editing') return;
    const draft = { ...this.state.draft, ...patch, ...(Object.prototype.hasOwnProperty.call(patch, 'image') ? { uploadId: crypto.randomUUID(), attachmentId: null } : {}), updatedAt: Date.now() };
    this.update({ draft });
    void this.persist(draft).then(() => { if (this.state.draft === draft) this.update({ storageError: null }); }, () => this.update({ storageError: 'This draft is only in memory because it could not be saved on this device. Keep this page open and retry saving.' }));
  };
  retrySave = async () => {
    try { await this.persist(this.state.draft); this.update({ storageError: null }); }
    catch { this.update({ storageError: 'The draft still could not be saved. Keep this page open to preserve your input.' }); }
  };
  discard = async () => {
    if (this.state.busy || ['unknown', 'sending'].includes(this.state.draft.status)) return;
    ++this.loadSequence;
    try { await this.saving.catch(() => {}); await this.repo.remove(this.state.draft.key); this.update({ draft: emptyMessageDraft(this.state.draft.scope, this.state.draft.conversationId), ready: true, storageError: null, deliveryError: null }); }
    catch { this.update({ storageError: 'The draft could not be discarded. Retry; the saved draft is retained.' }); }
  };
  newIntent = async () => {
    if (this.state.busy || this.state.draft.status !== 'rejected') return;
    const draft = { ...emptyMessageDraft(this.state.draft.scope, this.state.draft.conversationId), text: this.state.draft.text, image: this.state.draft.image, imageName: this.state.draft.imageName };
    try { await this.persist(draft); this.update({ draft, storageError: null, deliveryError: null }); }
    catch { this.update({ storageError: 'The editable draft could not be saved. The original request is retained.' }); }
  };
  private async acceptReceipt(receipt: MessageReceipt) {
    if (receipt.commandId !== this.state.draft.commandId || receipt.conversationId !== this.state.draft.conversationId) throw new Error('INVALID_MESSAGE_RECEIPT');
    const draft = { ...this.state.draft, status: 'confirmed' as const, receipt };
    // Preserve a durable confirmation before clearing the only local text/image.
    this.update({ draft, deliveryError: null });
    await this.persist(draft);
    await this.repo.remove(draft.key);
    this.update({ draft: emptyMessageDraft(draft.scope, draft.conversationId), storageError: null });
    this.confirmed();
  }
  checkDelivery = async () => {
    if (this.state.busy || !['unknown', 'rejected', 'confirmed'].includes(this.state.draft.status)) return;
    this.update({ busy: true, deliveryError: null });
    try {
      const receipt = await this.api.receipt(this.state.draft.scope.accountId, this.state.draft.commandId);
      if (receipt) await this.acceptReceipt(receipt);
      else this.update({ deliveryError: 'No confirmed receipt was found yet. The original request is retained; retrying the same message will not create a duplicate.' });
    } catch { this.update({ deliveryError: 'Delivery still could not be checked. Your draft and original request are retained.' }); }
    finally { this.update({ busy: false }); }
  };
  send = async () => {
    if (!this.state.ready || this.state.busy || this.state.draft.status === 'confirmed' || (!this.state.draft.text.trim() && !this.state.draft.image)) return;
    this.update({ busy: true, deliveryError: null });
    let attempted = false;
    try {
      let draft = this.state.draft;
      await this.persist(draft);
      this.update({ storageError: null });
      if (draft.image && !draft.attachmentId) {
        const uploaded = await this.api.upload(draft.scope, draft.uploadId, draft.image, draft.imageName ?? 'image');
        draft = { ...draft, attachmentId: uploaded.attachmentId };
        await this.persist(draft); this.update({ draft });
      }
      draft = { ...draft, status: 'sending', updatedAt: Date.now() };
      await this.persist(draft); this.update({ draft });
      attempted = true;
      const receipt = await this.api.send(draft.scope, { commandId: draft.commandId, conversationId: draft.conversationId, content: draft.text.trim(), attachmentId: draft.attachmentId });
      await this.acceptReceipt(receipt);
    } catch (error) {
      if (this.getSnapshot().draft.status === 'confirmed') this.update({ storageError: 'Delivery is confirmed, but the saved draft could not be cleared. Check delivery to retry cleanup.' });
      else {
        const unknown = attempted && (!(error instanceof MessageRequestError) || error.outcome === 'unknown');
        const draft = { ...this.state.draft, status: unknown ? 'unknown' as const : attempted ? 'rejected' as const : this.state.draft.status };
        this.update({ draft, deliveryError: error instanceof Error ? error.message : 'The message could not be sent. Your draft is retained.' });
        try { await this.persist(draft); } catch { this.update({ storageError: 'The latest delivery status could not be saved. Keep this page open; your input is retained here.' }); }
      }
    } finally { this.update({ busy: false }); }
  };
}
