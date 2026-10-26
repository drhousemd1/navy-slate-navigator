import {
  decodeActionReceipt, decodeActionScope, decodeActionCommand, scopeKey,
  type ActionProblem, type ActionQueueScope, type CommandOutcome, type QueueEntry, type ActionIntent, type ActionTransport,
} from './contracts';
import type { ActionQueueStore } from './store';
import { unknownProblem } from './transport';

export interface QueueConnection {
  isOnline(): boolean;
  subscribe(changed: () => void): () => void;
}
export const browserQueueConnection: QueueConnection = {
  isOnline: () => typeof navigator === 'undefined' || navigator.onLine,
  subscribe(changed) {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('online', changed); window.addEventListener('offline', changed);
    return () => { window.removeEventListener('online', changed); window.removeEventListener('offline', changed); };
  },
};
export interface ActionQueueOptions {
  store: ActionQueueStore;
  transport: ActionTransport;
  connection?: QueueConnection;
  now?: () => number;
  uuid?: () => string;
  requestTimeoutMs?: number;
  leaseMs?: number;
  maxAutomaticAttempts?: number;
  retryDelayMs?: (attempt: number) => number;
  /** Invalidate/re-read current data. A retry receipt has command-time balances;
   * NEVER overwrite newer wallet caches with those historical balances.
   */
  onConfirmed?: (entry: QueueEntry) => void;
  onStorageError?: (error: Error) => void;
  /** Rendering/invalidation failures do not change a durably saved result. */
  onObserverError?: (error: unknown) => void;
}

/** Durable intent queue, not an optimistic wallet/inventory projection.
 * Construct one per configured backend. Set context to null immediately on
 * identity loading/sign-out, then to the verified current account/period.
 */
export class ActionCommandQueue {
  private context: ActionQueueScope | null = null;
  private generation = 0;
  private running: Promise<void> | null = null;
  private disposed = false;
  private wakeAgain = false;
  private readonly manualRetries = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private activeRequest: AbortController | null = null;
  private readonly listeners = new Set<() => void>();
  private readonly stopConnection: () => void;
  private readonly connection: QueueConnection;
  private readonly now: () => number;
  private readonly uuid: () => string;
  private readonly timeout: number;
  private readonly leaseMs: number;
  private readonly maxAttempts: number;

  constructor(private readonly options: ActionQueueOptions) {
    this.connection = options.connection ?? browserQueueConnection;
    this.now = options.now ?? Date.now;
    this.uuid = options.uuid ?? (() => crypto.randomUUID());
    this.timeout = options.requestTimeoutMs ?? 20_000;
    this.leaseMs = options.leaseMs ?? 45_000;
    this.maxAttempts = options.maxAutomaticAttempts ?? 3;
    if (!Number.isFinite(this.timeout) || !Number.isFinite(this.leaseMs) || this.timeout <= 0 || this.leaseMs <= this.timeout || !Number.isSafeInteger(this.maxAttempts) || this.maxAttempts < 1) throw new Error('Invalid queue retry limits');
    this.stopConnection = this.connection.subscribe(() => {
      if (!this.connection.isOnline()) this.activeRequest?.abort();
      this.kick();
    });
  }

  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private observe(callback: () => void) {
    try { callback(); } catch (error) {
      try { this.options.onObserverError?.(error); } catch { /* Observers cannot invalidate a committed queue record. */ }
    }
  }
  private notify() { for (const listener of this.listeners) this.observe(listener); }
  private same(scope: ActionQueueScope) { return this.context !== null && scopeKey(scope) === scopeKey(this.context); }
  private storageError(error: unknown) { this.options.onStorageError?.(error instanceof Error ? error : new Error('Saved actions are unavailable.')); }
  private kick() { void this.flush().catch(error => this.storageError(error)); }
  private clearTimer() { if (this.timer) clearTimeout(this.timer); this.timer = null; }
  private schedule(at: number) {
    this.clearTimer();
    if (!this.disposed && this.context && this.connection.isOnline()) this.timer = setTimeout(() => { this.timer = null; this.kick(); }, Math.max(10, at - this.now()));
  }

  setContext(scope: ActionQueueScope | null): void {
    const next = scope ? decodeActionScope(scope) : null;
    if (next && next.backendId !== this.options.transport.backendId) throw new Error('Queue backend does not match the current identity');
    if (this.context && next && scopeKey(this.context) === scopeKey(next)) return;
    this.context = next; this.generation++; this.manualRetries.clear(); this.clearTimer(); this.activeRequest?.abort(); this.notify(); this.kick();
  }

  async enqueue(intent: ActionIntent): Promise<QueueEntry> {
    if (!this.context || this.disposed) throw new Error('Load the signed-in account and relationship before saving an action.');
    const scope = structuredClone(this.context);
    const command = decodeActionCommand({ ...intent, commandId: this.uuid(), expectedRelationshipId: scope.relationshipId });
    const time = this.now();
    // Strict durable write completes before any send. No points/inventory are
    // changed until a server receipt is confirmed by a separate UI integration.
    const entry = await this.options.store.insert({ version: 1, scope, command, createdAt: time, updatedAt: time,
      state: { status: 'pending', command }, attempts: 0, everSent: false, nextAttemptAt: time, problem: null, lease: null });
    this.notify(); this.kick();
    return entry;
  }

  /** Old periods for the SAME signed-in account remain visible but read-only.
   * No data from a signed-out/different account is returned to its UI.
   */
  async list(): Promise<(QueueEntry & { canReplay: boolean; canCancel: boolean })[]> {
    const scope = this.context, generation = this.generation;
    if (!scope) return [];
    const entries = await this.options.store.list();
    if (generation !== this.generation) return [];
    return entries.filter(e => e.scope.backendId === scope.backendId && e.scope.accountId === scope.accountId)
      .sort((a, b) => a.sequence - b.sequence).map(entry => ({ ...entry, canReplay: this.same(entry.scope),
        canCancel: this.same(entry.scope) && entry.state.status === 'pending' && !entry.everSent && !entry.lease }));
  }

  async cancelUnsent(commandId: string): Promise<boolean> {
    let cancelled = false;
    await this.options.store.update(commandId, entry => {
      if (!this.same(entry.scope) || entry.state.status !== 'pending' || entry.everSent || entry.lease) return entry;
      cancelled = true; return null;
    });
    if (cancelled) { this.notify(); this.kick(); }
    return cancelled;
  }

  /** Explicit retry, including after a correctable rejection, always keeps the
   * original command ID/payload. An uncertain action is never cancellable.
   */
  async retry(commandId: string): Promise<void> {
    if (this.disposed) throw new Error('This queue has been disposed.');
    const result = await this.options.store.update(commandId, entry => {
      if (!this.same(entry.scope) || entry.state.status === 'confirmed' || (entry.lease && entry.lease.until > this.now())) throw new Error('Action is not ready to retry in this account and period');
      return { ...entry, state: { status: entry.everSent && entry.state.status !== 'rejected' ? 'confirmation_unknown' : 'pending', command: entry.command },
        nextAttemptAt: this.now(), problem: null, lease: null, updatedAt: this.now() };
    });
    if (!result) throw new Error('The saved action was not found.');
    if (!this.same(result.scope)) return;
    this.manualRetries.add(commandId);
    this.notify();
    await this.flush();
  }

  async flush(): Promise<void> {
    if (this.running) { this.wakeAgain = true; return this.running; }
    if (this.disposed || !this.context || !this.connection.isOnline()) return;
    this.clearTimer();
    this.running = this.drain();
    try { await this.running; }
    finally { this.running = null; if (this.wakeAgain) { this.wakeAgain = false; this.kick(); } }
  }

  private async drain(): Promise<void> {
    while (!this.disposed && this.context && this.connection.isOnline()) {
      const scope = structuredClone(this.context), generation = this.generation;
      const rows = (await this.options.store.list()).filter(e => scopeKey(e.scope) === scopeKey(scope)).sort((a, b) => a.sequence - b.sequence);
      if (!this.same(scope) || generation !== this.generation) return;
      // Preserve order: a possibly-committed purchase must be reconciled before
      // a later use/delete. Definitively rejected entries do not block others.
      const candidate = rows.find(e => ['pending', 'sending', 'confirmation_unknown'].includes(e.state.status));
      if (!candidate) return;
      const forced = this.manualRetries.has(candidate.command.commandId);
      if (candidate.lease && candidate.lease.until > this.now()) { this.schedule(candidate.lease.until); return; }
      // A tab closed/crashed after saving 'sending'. Its expired lease never
      // means failure: the server might have committed before the tab closed.
      if (candidate.state.status === 'sending') {
        await this.options.store.update(candidate.command.commandId, current => current.state.status === 'sending' && (!current.lease || current.lease.until <= this.now())
          ? { ...current, state: { status: 'confirmation_unknown', command: current.command }, lease: null,
            problem: unknownProblem('REQUEST_INTERRUPTED'), nextAttemptAt: this.now(), updatedAt: this.now() } : current);
        this.notify();
        continue;
      }
      if (!forced && (candidate.problem?.retryable === false || candidate.attempts >= this.maxAttempts)) return;
      if (!forced && candidate.nextAttemptAt > this.now()) { this.schedule(candidate.nextAttemptAt); return; }
      const token = this.uuid();
      let previous: QueueEntry | null = null;
      const claimed = await this.options.store.update(candidate.command.commandId, current => {
        if (!this.same(scope) || generation !== this.generation || scopeKey(current.scope) !== scopeKey(scope) ||
            current.state.status === 'confirmed' || (!forced && current.state.status === 'rejected') ||
            (current.lease && current.lease.until > this.now()) ||
            (!forced && (current.attempts >= this.maxAttempts || current.problem?.retryable === false || current.nextAttemptAt > this.now()))) return current;
        previous = current;
        return { ...current, state: { status: 'sending', command: current.command }, attempts: current.attempts + 1, everSent: true,
          lease: { token, until: this.now() + this.leaseMs }, updatedAt: this.now() };
      });
      if (!claimed || claimed.state.status === 'confirmed' || claimed.state.status === 'rejected') continue;
      if (claimed.lease?.token !== token || !previous) {
        if (claimed.lease) this.schedule(claimed.lease.until);
        else if (claimed.nextAttemptAt > this.now()) this.schedule(claimed.nextAttemptAt);
        return;
      }
      this.manualRetries.delete(claimed.command.commandId);
      this.notify();
      let outcome: CommandOutcome;
      if (!this.same(scope) || generation !== this.generation || !this.connection.isOnline()) outcome = { kind: 'not_sent', problem: { code: 'CONTEXT_CHANGED', retryable: false, message: 'The original account and relationship must be active before sending this action.' } };
      else outcome = await this.request(claimed);
      if (outcome.kind === 'confirmed') {
        try { outcome = { kind: 'confirmed', receipt: decodeActionReceipt(outcome.receipt, claimed.command) }; }
        catch { outcome = { kind: 'confirmation_unknown', problem: unknownProblem('INVALID_RECEIPT', false) }; }
      }
      const wasUncertain = previous.state.status === 'confirmation_unknown' || previous.state.status === 'sending';
      let finalizedByThisAttempt = false;
      const result = await this.options.store.update(claimed.command.commandId, current => {
        if (current.lease?.token !== token || current.state.status === 'confirmed') return current;
        finalizedByThisAttempt = true;
        const base = { ...current, lease: null, updatedAt: this.now() };
        if (outcome.kind === 'confirmed') return { ...base, state: { status: 'confirmed', receipt: outcome.receipt }, problem: null, nextAttemptAt: 0 };
        if (outcome.kind === 'rejected' && !wasUncertain) return { ...base, state: { status: 'rejected', command: current.command, reason: outcome.problem.message }, problem: outcome.problem };
        if (outcome.kind === 'not_sent' && !wasUncertain) return { ...base, state: { status: 'pending', command: current.command }, everSent: previous!.everSent, problem: outcome.problem };
        // A later guard/auth rejection does not prove an earlier uncertain
        // attempt was rolled back. Keep its unknown outcome visible.
        const problem: ActionProblem = outcome.kind === 'rejected' ? { ...outcome.problem, message: `${unknownProblem().message} ${outcome.problem.message}` } : outcome.problem;
        return { ...base, state: { status: 'confirmation_unknown', command: current.command }, problem,
          nextAttemptAt: this.now() + (this.options.retryDelayMs?.(current.attempts) ?? Math.min(1000 * 2 ** (current.attempts - 1), 10_000)) };
      });
      this.notify();
      if (finalizedByThisAttempt && result?.state.status === 'confirmed' && outcome.kind === 'confirmed' && this.same(scope) && generation === this.generation) this.observe(() => this.options.onConfirmed?.(result));
      if (result && ['pending', 'confirmation_unknown'].includes(result.state.status)) {
        if (result.problem?.retryable && result.attempts < this.maxAttempts) this.schedule(result.nextAttemptAt);
        return;
      }
    }
  }

  private async request(entry: QueueEntry): Promise<CommandOutcome> {
    const controller = new AbortController(); this.activeRequest = controller;
    let timer: ReturnType<typeof setTimeout>;
    let onAbort: () => void;
    const interrupted = new Promise<CommandOutcome>(resolve => {
      onAbort = () => resolve({ kind: 'confirmation_unknown', problem: unknownProblem('REQUEST_INTERRUPTED') });
      controller.signal.addEventListener('abort', onAbort, { once: true });
    });
    const expired = new Promise<CommandOutcome>(resolve => { timer = setTimeout(() => {
      resolve({ kind: 'confirmation_unknown', problem: unknownProblem('REQUEST_TIMEOUT') }); controller.abort();
    }, this.timeout); });
    try {
      return await Promise.race([expired, interrupted, this.options.transport.execute(entry.command, entry.scope, controller.signal)
        .catch(() => ({ kind: 'confirmation_unknown' as const, problem: unknownProblem('CONNECTION_LOST') }))]);
    } finally { clearTimeout(timer!); controller.signal.removeEventListener('abort', onAbort!); if (this.activeRequest === controller) this.activeRequest = null; }
  }

  dispose(): void {
    this.disposed = true; this.generation++; this.context = null; this.clearTimer(); this.activeRequest?.abort(); this.stopConnection(); this.listeners.clear();
  }
}

/** Existing UI uses the same class and database through this compatibility name. */
export { ActionCommandQueue as RewardCommandQueue };
