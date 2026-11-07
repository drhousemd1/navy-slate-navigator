/** Bounded IDB transaction adapter for cache unit tests. Native IndexedDB timing
 * and browser storage events remain explicit browser verification requirements. */
export function readCacheFactory() {
  const databases = new Map<string, Map<string, Map<IDBValidKey, unknown>>>();
  const opened: string[] = [];
  const heldOpens: (() => void)[] = [], heldCommits: (() => void)[] = [];
  const control = { holdOpen: false, holdCommit: false, failWrite: false };
  const factory = { databases: async () => [...databases.keys()].map(name => ({ name, version: 1 })), open(name: string) {
    opened.push(name);
    const open = {} as IDBOpenDBRequest;
    const run = () => {
      const missing = !databases.has(name);
      if (missing) databases.set(name, new Map());
      const stores = databases.get(name)!;
      let upgradeAborted = false;
      const db = { close() {}, objectStoreNames: { contains: (store: string) => stores.has(store), get length() { return stores.size; } },
        createObjectStore: (store: string) => { stores.set(store, new Map()); },
        transaction(storeName: string, mode = 'readonly') {
          const original = stores.get(storeName)!; const values = new Map(original); let aborted = false; let scheduled = false;
          const tx = { abort() { if (aborted) return; aborted = true; queueMicrotask(() => tx.onabort?.({} as Event)); },
            onabort: null, onerror: null, oncomplete: null,
            objectStore: () => ({
              get(key: IDBValidKey) { const request = { result: values.get(key) } as IDBRequest; complete(); return request; },
              put(value: unknown, key: IDBValidKey) { values.set(key, structuredClone(value)); complete(); return {} as IDBRequest; },
              openCursor() {
                const request = {} as IDBRequest; const entries = [...values.entries()]; let index = 0;
                const next = () => queueMicrotask(() => {
                  const entry = entries[index]; Object.assign(request, { result: entry ? { value: entry[1], delete: () => values.delete(entry[0]), continue: () => { index++; next(); } } : null });
                  request.onsuccess?.({} as Event); if (!entry) complete();
                }); next(); return request;
              },
            }),
          } as unknown as IDBTransaction;
          function complete() {
            if (scheduled) return; scheduled = true;
            const commit = () => { if (aborted) return; if (mode === 'readwrite' && control.failWrite) { aborted = true; tx.onerror?.({} as Event); return; } if (mode === 'readwrite') { original.clear(); values.forEach((value, key) => original.set(key, value)); } tx.oncomplete?.({} as Event); };
            if (control.holdCommit) heldCommits.push(commit); else queueMicrotask(commit);
          }
          return tx;
        },
      } as unknown as IDBDatabase;
      Object.assign(open, { result: db, transaction: { abort() { upgradeAborted = true; databases.delete(name); } } });
      if (missing) open.onupgradeneeded?.({} as IDBVersionChangeEvent);
      if (upgradeAborted) open.onerror?.({} as Event); else open.onsuccess?.({} as Event);
    };
    if (control.holdOpen) heldOpens.push(run); else queueMicrotask(run);
    return open;
  } } as unknown as IDBFactory;
  return { factory, databases, opened, control, releaseOpens: () => { control.holdOpen = false; heldOpens.splice(0).forEach(run => run()); }, releaseCommits: () => { control.holdCommit = false; heldCommits.splice(0).forEach(run => run()); },
    rows: (database: string, store: string) => { if (!databases.has(database)) databases.set(database, new Map()); const stores = databases.get(database)!; if (!stores.has(store)) stores.set(store, new Map()); return stores.get(store)!; } };
}
