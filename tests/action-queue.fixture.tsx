import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RewardCommandQueue, type QueueConnection } from '@/data/actions/queue';
import { IndexedDBActionQueueStore } from '@/data/actions/store';
import { scopeKey, type ActionQueueScope, type RewardCommand, type StoredActionReceipt } from '@/data/actions/contracts';
import { unknownProblem } from '@/data/actions/transport';

// This fixture imports no configured Supabase client. Its transport returns
// synthetic values and makes no HTTP/backend request under any circumstance.
const markerKey = 'obedience-action-queue-fixture-v2';
const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const currentScope: ActionQueueScope = { backendId: 'https://action-queue-fixture.invalid', accountId: id(1), participantId: id(2), relationshipId: id(3), relationshipSessionId: id(1000) };
const previousScope = { ...currentScope, relationshipId: id(4) };
const differentAccount = { ...currentScope, accountId: id(5), participantId: id(6), relationshipId: id(7) };
interface Marker { database: string; originalCommand: RewardCommand; callsBeforeReload: number; phase: 'prepared' | 'complete'; checks: string[] }
function readMarker(): Marker | null { const value = sessionStorage.getItem(markerKey); return value ? JSON.parse(value) : null; }
const markerOnLoad = readMarker();
function assert(condition: unknown, message: string): void { if (!condition) throw new Error(message); }
function makeConnection() {
  const state = { online: false };
  const connection: QueueConnection = { isOnline: () => state.online, subscribe: () => () => {} };
  return { state, connection };
}
function result(command: RewardCommand): StoredActionReceipt {
  return { commandId: command.commandId, relationshipId: command.expectedRelationshipId, relationshipSessionId: currentScope.relationshipSessionId, eventIds: [id(8)], confirmedAt: '2026-10-26T12:00:00Z', balances: [{ participantId: id(2), currency: 'sub', balance: 25 }], availableRewardQuantities: [], refunds: [], feedback: [] };
}

// Seed the exact historical storage shape through native IDB. New inserts via
// the production store correctly require a verified session and cannot do this.
async function seedHistorical(database: string, source: Awaited<ReturnType<IndexedDBActionQueueStore['list']>>[number]) {
  const { sequence: _sequence, ...base } = source;
  const { relationshipSessionId: _session, ...oldScope } = currentScope;
  const oldCommand = { ...base.command, commandId: id(30) };
  const { relationshipSessionId: _receiptSession, ...oldReceipt } = result({ ...oldCommand, commandId: id(31) } as RewardCommand);
  const rows = [
    { ...base, scope: oldScope, command: oldCommand, state: { status: 'pending', command: oldCommand }, attempts: 0, everSent: false, problem: null, lease: null },
    { ...base, scope: oldScope, command: { ...oldCommand, commandId: id(31) }, state: { status: 'confirmed', receipt: oldReceipt }, attempts: 1, everSent: true, problem: null, lease: null },
    { ...base, scope: { ...currentScope, relationshipSessionId: id(999) }, command: { ...oldCommand, commandId: id(32) }, state: { status: 'pending', command: { ...oldCommand, commandId: id(32) } }, attempts: 0, everSent: false, problem: null, lease: null },
  ];
  await new Promise<void>((resolve, reject) => {
    const open = indexedDB.open(database, 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result; const transaction = db.transaction('commands', 'readwrite');
      for (const row of rows) transaction.objectStore('commands').add(row);
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = transaction.onabort = () => { db.close(); reject(new Error('Historical fixture could not be seeded')); };
    };
  });
}

export function Fixture() {
  const [marker, setMarker] = useState(markerOnLoad);
  const [status, setStatus] = useState(markerOnLoad?.phase === 'complete' ? 'Passed' : 'Ready');
  const [busy, setBusy] = useState(false);
  async function run(work: () => Promise<void>) { setBusy(true); try { await work(); } catch (error) { setStatus(`FAILED: ${error instanceof Error ? error.message : String(error)}`); } finally { setBusy(false); } }
  async function prepare() {
    const database = `obedience-action-queue-fixture-${crypto.randomUUID()}`;
    const store = new IndexedDBActionQueueStore(database); const network = makeConnection(); let sends = 0;
    const queue = new RewardCommandQueue({ store, connection: network.connection, maxAutomaticAttempts: 1,
      transport: { backendId: currentScope.backendId, execute: async () => { sends++; return { kind: 'confirmation_unknown', problem: unknownProblem('SYNTHETIC_RESPONSE_LOST') }; } } });
    try {
      queue.setContext(currentScope);
      const original = await queue.enqueue({ kind: 'reward_buy', rewardId: id(9), expectedCost: 20 });
      network.state.online = true; await queue.flush(); network.state.online = false;
      assert((await queue.list())[0].state.status === 'confirmation_unknown', 'Lost response must remain unknown');
      assert(await queue.cancelUnsent(original.command.commandId) === false, 'Uncertain command must not be cancellable');
      queue.setContext(previousScope); await queue.enqueue({ kind: 'reward_delete', rewardId: id(9) });
      queue.setContext(differentAccount); await queue.enqueue({ kind: 'reward_gift', rewardId: id(9) });
      queue.setContext(null); assert((await queue.list()).length === 0, 'Signed-out view must not expose saved account data');
      await seedHistorical(database, original);
      assert((await store.list()).length === 6, 'Sign-out must retain all six durable records');
      const saved: Marker = { database, originalCommand: original.command, callsBeforeReload: sends, phase: 'prepared', checks: [
        'Native IndexedDB contains six synthetic records, including pre-session pending/confirmed rows and an older session.', 'Lost response is unknown and cannot be cancelled.', 'Sign-out hides records and leaves their durable contents intact.',
      ] };
      sessionStorage.setItem(markerKey, JSON.stringify(saved)); setMarker(saved); setStatus('Prepared — reload this page to verify persistence');
    } finally { queue.dispose(); await store.close(); }
  }
  async function verify() {
    assert(markerOnLoad?.phase === 'prepared', 'A real page reload is required before verification');
    const saved = markerOnLoad; const store = new IndexedDBActionQueueStore(saved.database); const secondStore = new IndexedDBActionQueueStore(saved.database);
    const network = makeConnection(); const sends: RewardCommand[] = []; let confirmations = 0;
    const queue = new RewardCommandQueue({ store, connection: network.connection, maxAutomaticAttempts: 1,
      transport: { backendId: currentScope.backendId, execute: async command => { sends.push(structuredClone(command)); return { kind: 'confirmed', receipt: result(command) }; }, readReceipt: async command => {
        if (command.commandId !== id(30)) return { kind: 'not_found' };
        const { relationshipSessionId: _session, ...oldReceipt } = result(command as RewardCommand);
        return { kind: 'confirmed', receipt: oldReceipt };
      } }, onConfirmed: () => { confirmations++; } });
    const checks = [...saved.checks];
    try {
      assert((await store.list()).length === 6, 'Actual reload must recover all six records');
      const oldConfirmed = (await store.list()).find(row => row.command.commandId === id(31))!;
      const confirmedBytes = JSON.stringify(oldConfirmed);
      assert(!('relationshipSessionId' in oldConfirmed.scope) && oldConfirmed.state.status === 'confirmed' && !('relationshipSessionId' in oldConfirmed.state.receipt), 'Old records must not gain inferred session fields');
      checks.push('Actual browser reload recovered original pre-session pending and confirmed records without inferred fields.');
      queue.setContext(differentAccount); const otherView = await queue.list();
      assert(otherView.length === 1 && otherView[0].scope.accountId === differentAccount.accountId, 'Different account may only see its own intent');
      queue.setContext(currentScope); const view = await queue.list();
      assert(view.length === 5 && view.some(row => scopeKey(row.scope) === scopeKey(previousScope) && !row.canReplay && !row.canCancel), 'Previous period must remain read-only');
      network.state.online = true; await queue.flush(); assert(sends.length === 0, 'Reconnect must not reset persisted automatic retry cap');
      checks.push('Account switch exposes only its own records; old period stays read-only and cannot replay.');
      await queue.retry(saved.originalCommand.commandId);
      assert(sends.length === 1 && JSON.stringify(sends[0]) === JSON.stringify(saved.originalCommand), 'Reconciliation must use exactly the original ID and payload');
      await queue.flush(); assert(sends.length === 1 && confirmations === 1, 'Confirmed command must not send/announce twice');
      checks.push('Explicit reconciliation after reload used the original command byte-for-byte and confirmed once.');
      const durable = await secondStore.list();
      assert(durable.find(row => row.command.commandId === saved.originalCommand.commandId)?.state.status === 'confirmed', 'Second native IDB connection must see durable confirmation');
      assert(durable.filter(row => row.state.status === 'pending').length === 4, 'Other period, account and historical intents must remain untouched');
      const continued = view.find(row => row.command.commandId === id(32))!;
      assert(!continued.canReplay && !continued.canCancel && continued.canReconcile, 'Same period with an older session must never revive');
      const continuedBytes = JSON.stringify(durable.find(row => row.command.commandId === id(32)));
      assert(await queue.reconcile(id(32)) === 'not_found', 'Missing old-session receipt stays unconfirmed');
      assert(JSON.stringify((await store.list()).find(row => row.command.commandId === id(32))) === continuedBytes, 'A missing receipt must not rewrite the original row');
      assert(await queue.reconcile(id(30)) === 'confirmed', 'Owned pre-session receipt should recover through read-only lookup');
      const recovered = (await secondStore.list()).find(row => row.command.commandId === id(30))!;
      assert(recovered.state.status === 'confirmed' && recovered.receiptRecoveredAt && recovered.attempts === 0 && !recovered.everSent && !('relationshipSessionId' in recovered.scope), 'Receipt recovery must preserve original scope/attempt facts');
      assert(sends.length === 1 && confirmations === 1, 'Old receipt recovery must not send or celebrate');
      assert(JSON.stringify((await secondStore.list()).find(row => row.command.commandId === id(31))) === confirmedBytes, 'Original historical confirmation must remain byte-identical');
      checks.push('Continued-period old intent stayed blocked; owned historical receipt recovered without executing, rebinding or celebrating.');
      checks.push('Independent native IDB connection read the confirmation; other account/period records were unchanged.');
      // Cross-connection transaction check: only one competing claim may win.
      const claimTarget = durable.find(row => row.scope.accountId === differentAccount.accountId)!;
      let winners = 0;
      const claim = (token: string) => (row: typeof claimTarget) => {
        if (row.lease) return row;
        winners++;
        return { ...row, attempts: 1, everSent: true, state: { status: 'sending' as const, command: row.command }, lease: { token, until: Date.now() + 1000 } };
      };
      await Promise.all([store.update(claimTarget.command.commandId, claim('connection-a')), secondStore.update(claimTarget.command.commandId, claim('connection-b'))]);
      assert(winners === 1, 'Two native IDB connections must serialize their claim transactions');
      // This was a synthetic store-only claim, not a send. Restore its fixture state.
      await store.update(claimTarget.command.commandId, () => claimTarget);
      checks.push('Two real IndexedDB connections serialized competing command claims: one winner.');
      const complete: Marker = { ...saved, phase: 'complete', checks }; sessionStorage.setItem(markerKey, JSON.stringify(complete)); setMarker(complete); setStatus('Passed');
    } finally { queue.dispose(); await Promise.all([store.close(), secondStore.close()]); }
  }
  async function reset() {
    if (marker) {
      assert(marker.database.startsWith('obedience-action-queue-fixture-'), 'Only this synthetic fixture database can be removed');
      await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase(marker.database); request.onsuccess = () => resolve(); request.onerror = () => reject(new Error('Fixture cleanup failed')); request.onblocked = () => reject(new Error('Close another fixture tab before cleanup')); });
    }
    sessionStorage.removeItem(markerKey); window.location.reload();
  }
  return <main style={{ maxWidth: 760, margin: '40px auto', padding: 24, color: '#e2e8f0', fontFamily: 'system-ui', background: '#172131', borderRadius: 16 }}>
    <h1>Durable action queue verification</h1><p>Synthetic records only. No Supabase client, real account, or backend request is used.</p>
    <p role="status">{status}</p>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {!marker && <button disabled={busy} onClick={() => run(prepare)}>Prepare offline and lost-response records</button>}
      {marker?.phase === 'prepared' && !markerOnLoad && <button disabled={busy} onClick={() => window.location.reload()}>Reload and retain saved actions</button>}
      {markerOnLoad?.phase === 'prepared' && marker?.phase !== 'complete' && <button disabled={busy} onClick={() => run(verify)}>Verify after real reload</button>}
      {marker && <button disabled={busy} onClick={() => run(reset)}>Remove synthetic fixture data</button>}
    </div>
    <ol>{marker?.checks.map(check => <li key={check} style={{ marginBlock: 10 }}>{check}</li>)}</ol>
    <p>Browser storage can still be cleared or evicted by the user/browser. This verifies durable local storage across reload; it is not a remote backup or cross-device queue.</p>
  </main>;
}
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<Fixture />);
