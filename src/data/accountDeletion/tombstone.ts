const key = (backend: string, account: string) => `obedience-deleted-account:v1:${JSON.stringify([backend, account])}`;
export function markDeletedAccount(backend: string, account: string) { localStorage.setItem(key(backend, account), 'complete'); }
export function isDeletedAccount(backend: string, account: string) { return localStorage.getItem(key(backend, account)) === 'complete'; }
export function requireUndeletedAccount(backend: string, account: string) { if (isDeletedAccount(backend, account)) throw new Error('This account was deleted. Its saved data cannot be written again.'); }
