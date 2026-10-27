# Durable action commands

One durable queue supports the reviewed reward, task, rule, and punishment commands. The existing `ActionCommandsContext` consumes this queue; page-specific integration and query invalidation remain its consumers' responsibility. This module neither changes balances optimistically nor mounts feedback UI.

```ts
const store = new IndexedDBActionQueueStore();
const transport = createSupabaseActionTransport();
const queue = new ActionCommandQueue({
  store,
  transport,
  onConfirmed(entry) {
    // Invalidate/re-read current scope's affected queries.
    // The receipt is command-time history: do not overwrite current balances/counts.
    // Feed confirmed scoped results to feedback only after checking preferences.
  },
  onStorageError(error) { /* Present a persistent saved-action error. */ },
  onObserverError(error) { /* Handle the UI/invalidation failure separately. */ },
});
```

Set `queue.setContext(null)` immediately when identity is unavailable, loading, signed out, or not allowed to execute these transactions. Set the verified `{ backendId: transport.backendId, accountId, participantId, relationshipId, relationshipSessionId }` only when the current account and active relationship session are known. Continue rotates the session even when it retains the same period and participant IDs. The backend ID comes from the same validated configuration as the shared Supabase client. No credential is saved in an entry.

`await queue.enqueue({ kind: 'reward_buy', rewardId, expectedCost: displayedReward.cost })` saves a new intent before sending. Buy preserves the displayed price as `expectedCost`; the server rejects a changed price without spending. An explicit new purchase at a changed price requires a new user intent, never editing the saved command. Gift/Delete use only `kind` and `rewardId`; Use is `{ kind: 'reward_redeem', rewardId, inventoryCurrency? }`.

Other intents are `{ kind: 'task_complete', taskId }`, `{ kind: 'rule_violation', ruleId }`, and `{ kind: 'punishment_apply', punishmentId }`. Task completion routes to `execute_task_command`; rule/punishment recording routes to `execute_recording_command`. Every `{ kind: 'undo', eventId }` routes to `undo_action`, where the server's original event selects the correct family. The browser never supplies a beneficiary, point delta, recording timestamp, or timezone. Every enqueue means a **new user intent** and gets one UUID. Prevent duplicate UI submissions. Never enqueue again to retry an existing intent.

The new canonical names are `ActionCommandQueue`, `createSupabaseActionTransport`, `createActionTransport`, and `ActionIntent`. Existing `RewardCommandQueue`, `createSupabaseRewardTransport`, `createRewardTransport`, and `RewardIntent` exports remain aliases to the same implementation. `QueuedActionCommand` covers the complete domain union; the legacy `RewardCommand` type and `rewardCommandParameters` helper remain reward-specific. Low-level transport injection now receives `{ name, parameters }`, so tests/adapters can distinguish the actual RPC. No new IndexedDB database or queue instance is needed.

Receipts retain typed `taskProgress`, `recordingProgress`, and `pointDeltas` when supplied. Parsing validates targets, dates, ISO week/count consistency, integer deltas and their wallets. Rule events can have an empty delta array; zero and negative point effects remain unchanged. Undo can legitimately return null current progress after a definition/owner/timezone change. Progress and balances are historical command-time results: invalidate and re-read current affected queries after confirmation.

Subscribe with `queue.subscribe(listener)`, load initial state with `await queue.list()`, and reload that list on changes. Retain the unsubscribe function. The returned rows include the current backend/account's older periods as read-only records. Other accounts are hidden. The subscription covers this queue instance; callers should refresh on visibility/focus if they want immediate display of another tab's completed work. Native IndexedDB transactions coordinate sends between tabs even without a shared UI subscription.

- `queue.retry(commandId)` requests reconciliation or an explicit retry after a correctable rejection with the **same ID and unchanged payload**. It never creates a replacement command. Retry of an earlier action keeps its original queue order. An earlier uncertain action blocks later actions until reconciled.
- `queue.cancelUnsent(commandId)` removes only a current-scope pending action that has never been sent or claimed. Unknown/sending/confirmed/rejected history cannot be dismissed through this method.
- `queue.reconcile(commandId)` performs only `get_my_action_receipt` for a historical entry owned by the same signed-in account/backend. A returned receipt is validated and saved without calling `onConfirmed`; it cannot replace current balances or replay feedback. A missing receipt leaves the entry byte-for-byte unchanged and blocked. It never falls through to execute or creates a new intent.
- `queue.flush()` attempts current-scope work when online. Automatic retry is bounded to three total attempts by default, persisted across reloads. A user retry can permit one additional attempt after that cap. Reconnect cannot reset the cap. An explicit retry requested while offline is retained in this running instance; after another reload the record still exists and the user can retry again.
- `queue.dispose()` stops listeners/timers and aborts this instance's request. It never clears stored actions. `store.close()` closes only the store connection.

An interrupted request or expired sending lease becomes `confirmation_unknown`. A later guard rejection cannot prove a previously uncertain attempt did not commit, so it stays unknown. Invalid/mismatched receipts stop automatic retries and remain saved for review. Cancellation, sign-out, and scope changes do not turn uncertainty into failure or success. The transport pins the account-checked JWT to the request so a later login cannot change its actor.

Confirmation is exposed only after the receipt is validated and durably saved. `onConfirmed` is an in-process hook, **not** a durable notification delivery system: a crash after persistence can prevent the callback. Stored confirmed receipts remain readable; partner delivery, preferences, durable feedback acknowledgement, and outbox consumption belong to integration. A historical replay receipt must not overwrite more recent query results. No optimistic points or inventory projection is performed here.

The dedicated IndexedDB database is outside the app's sign-out-cleared query/form stores. Browser/user clearing or eviction can still remove local data; this is not a remote backup or cross-device queue. Corrupt records stop processing without deleting the originals. Receipts and pending actions contain private app information accessible to trusted same-origin code; no untrusted script should be granted that origin.

Storage compatibility: the database and row version stay at 1; no migration rewrites existing records. `StoredActionScope` permits an absent session only to read historical entries. `ActionQueueScope` requires a verified UUID for every new insert/execution. Missing or older sessions never match the current execution context, even after Continue. Historical receipts may omit `relationshipSessionId`; a new execution receipt must match the captured session. Read-only recovery adds `receiptRecoveredAt` provenance while preserving original scope, command, attempt count and `everSent` facts. It does not invent a send attempt or infer a historical session.

Verification: `tests/action-queue.test.ts` exercises the engine using an atomic in-memory store; `tests/action-transport.test.ts` validates reward request/error/receipt contracts; `tests/action-domains.test.ts` covers task/rule/punishment routing, receipt validation and scoped recovery. `tests/action-adapter.test.ts` uses the real Supabase SDK with a stubbed network for every RPC route and account-switch token binding. `tests/action-queue.html` is the existing dev-only synthetic reward browser fixture for native IndexedDB reload persistence, scope protection, same-ID recovery, and concurrent connection claims. It imports no configured Supabase client and makes no backend request. The new family tests do not claim live backend or page-path verification.
