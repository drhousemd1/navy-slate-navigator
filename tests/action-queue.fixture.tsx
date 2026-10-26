import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RewardCommandQueue, type QueueConnection } from '@/data/actions/queue';
import { IndexedDBActionQueueStore } from '@/data/actions/store';
import { scopeKey, type ActionQueueScope, type RewardCommand } from '@/data/actions/contracts';
import { unknownProblem } from '@/data/actions/transport';
import type { ActionReceipt } from '@/domain/actions/types';

// This fixture imports no configured Supabase client. Its transport returns
// synthetic values and makes no HTTP/backend request under any circumstance.
const markerKey = 'obedience-action-queue-fixture-v1';
const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const currentScope: ActionQueueScope = { backendId: 'https://action-queue-fixture.invalid', accountId: id(1), participantId: id(2), relationshipId: id(3) };
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
function result(command: RewardCommand): ActionReceipt {
  return { commandId: command.commandId, relationshipId: command.expectedRelationshipId, eventIds: [id(8)], confirmedAt: '2026-10-26T12:00:00Z', balances: [{ participantId: id(2), currency: 'sub', balance: 25 }], availableRewardQuantities: [], refunds: [], feedback: [] };
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
      assert((await store.list()).length === 3, 'Sign-out must retain all three durable records');
      const saved: Marker = { database, originalCommand: original.command, callsBeforeReload: sends, phase: 'prepared', checks: [
        'Native IndexedDB contains three scoped synthetic records.', 'Lost response is unknown and cannot be cancelled.', 'Sign-out hides records and leaves their durable contents intact.',
      ] };
      sessionStorage.setItem(markerKey, JSON.stringify(saved)); setMarker(saved); setStatus('Prepared — reload this page to verify persistence');
    } finally { queue.dispose(); await store.close(); }
  }
  async function verify() {
    assert(markerOnLoad?.phase === 'prepared', 'A real page reload is required before verification');
    const saved = markerOnLoad; const store = new IndexedDBActionQueueStore(saved.database); const secondStore = new IndexedDBActionQueueStore(saved.database);
    const network = makeConnection(); const sends: RewardCommand[] = []; let confirmations = 0;
    const queue = new RewardCommandQueue({ store, connection: network.connection, maxAutomaticAttempts: 1,
      transport: { backendId: currentScope.backendId, execute: async command => { sends.push(structuredClone(command)); return { kind: 'confirmed', receipt: result(command) }; } }, onConfirmed: () => { confirmations++; } });
    const checks = [...saved.checks];
    try {
      assert((await store.list()).length === 3, 'Actual reload must recover all three records'); checks.push('Actual browser reload recovered every saved record.');
      queue.setContext(differentAccount); const otherView = await queue.list();
      assert(otherView.length === 1 && otherView[0].scope.accountId === differentAccount.accountId, 'Different account may only see its own intent');
      queue.setContext(currentScope); const view = await queue.list();
      assert(view.length === 2 && view.some(row => scopeKey(row.scope) === scopeKey(previousScope) && !row.canReplay && !row.canCancel), 'Previous period must remain read-only');
      network.state.online = true; await queue.flush(); assert(sends.length === 0, 'Reconnect must not reset persisted automatic retry cap');
      checks.push('Account switch exposes only its own records; old period stays read-only and cannot replay.');
      await queue.retry(saved.originalCommand.commandId);
      assert(sends.length === 1 && JSON.stringify(sends[0]) === JSON.stringify(saved.originalCommand), 'Reconciliation must use exactly the original ID and payload');
      await queue.flush(); assert(sends.length === 1 && confirmations === 1, 'Confirmed command must not send/announce twice');
      checks.push('Explicit reconciliation after reload used the original command byte-for-byte and confirmed once.');
      const durable = await secondStore.list();
      assert(durable.find(row => row.command.commandId === saved.originalCommand.commandId)?.state.status === 'confirmed', 'Second native IDB connection must see durable confirmation');
      assert(durable.filter(row => row.state.status === 'pending').length === 2, 'Other period and account intents must remain untouched');
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
