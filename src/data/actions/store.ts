import { decodeActionScope, decodeActionCommand, decodeQueueEntry, type NewQueueEntry, type QueueEntry } from './contracts';

export interface ActionQueueStore {
  insert(entry: NewQueueEntry): Promise<QueueEntry>;
  list(): Promise<QueueEntry[]>;
  /** The synchronous callback runs atomically with its read/write. Null deletes
   * only when an explicit caller authorizes cancelling an unsent command.
   */
  update(commandId: string, change: (current: QueueEntry) => QueueEntry | null): Promise<QueueEntry | null>;
}

/** Dedicated IndexedDB: never a query-cache/form-state store, no sign-out clear.
 * Read/write transactions serialize competing tabs' claims and cancellations.
 */
export class IndexedDBActionQueueStore implements ActionQueueStore {
  private database: Promise<IDBDatabase> | null = null;
  constructor(private readonly name = 'obedience-action-commands-v1', private readonly factory: IDBFactory = globalThis.indexedDB) {}

  private open(): Promise<IDBDatabase> {
    if (!this.factory) return Promise.reject(new Error('IndexedDB is unavailable; no action was sent.'));
    if (!this.database) this.database = new Promise((resolve, reject) => {
      const request = this.factory.open(this.name, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('commands', { keyPath: 'sequence', autoIncrement: true });
        store.createIndex('commandId', 'command.commandId', { unique: true });
      };
      request.onerror = () => { this.database = null; reject(new Error('The saved-action database could not be opened.')); };
      request.onblocked = () => { this.database = null; reject(new Error('Another app tab is blocking the saved-action database.')); };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); this.database = null; };
        resolve(db);
      };
    });
    return this.database;
  }

  async insert(entry: NewQueueEntry): Promise<QueueEntry> {
    // Validate before writing; malformed intent must never become a durable job.
    decodeActionScope(entry.scope);
    decodeActionCommand(entry.command);
    decodeQueueEntry({ ...entry, sequence: 1 });
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('commands', 'readwrite', { durability: 'strict' });
      const request = transaction.objectStore('commands').add(structuredClone(entry));
      let saved: QueueEntry;
      request.onsuccess = () => { saved = { ...entry, sequence: Number(request.result) }; };
      transaction.oncomplete = () => resolve(decodeQueueEntry(saved));
      transaction.onabort = transaction.onerror = () => reject(new Error('The action could not be saved. It was not sent.'));
    });
  }

  /** Close this tab's connection without deleting any saved actions. */
  async close(): Promise<void> {
    const database = this.database;
    this.database = null;
    if (database) (await database).close();
  }

  async list(): Promise<QueueEntry[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('commands', 'readonly');
      const request = transaction.objectStore('commands').getAll();
      transaction.oncomplete = () => {
        try { resolve(request.result.map(decodeQueueEntry)); }
        catch { reject(new Error('A saved action could not be validated. Saved records were kept for recovery.')); }
      };
      transaction.onabort = transaction.onerror = () => reject(new Error('Saved actions could not be read.'));
    });
  }

  async update(commandId: string, change: (current: QueueEntry) => QueueEntry | null): Promise<QueueEntry | null> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('commands', 'readwrite', { durability: 'strict' });
      const store = transaction.objectStore('commands');
      const request = store.index('commandId').get(commandId);
      let result: QueueEntry | null = null;
      request.onsuccess = () => {
        if (!request.result) return;
        try {
          const previous = decodeQueueEntry(request.result);
          result = change(previous);
          if (result) {
            if (result.sequence !== previous.sequence || JSON.stringify(result.scope) !== JSON.stringify(previous.scope) ||
                JSON.stringify(result.command) !== JSON.stringify(previous.command)) throw new Error('Saved command identity is immutable');
            store.put(decodeQueueEntry(result));
          } else store.delete(previous.sequence);
        } catch { transaction.abort(); }
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = transaction.onerror = () => reject(new Error('The saved action could not be updated. Its original record was kept.'));
    });
  }
}
