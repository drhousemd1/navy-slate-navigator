import { compareMessagePosition, mergeMessages, messageScopeKey, type ConversationList, type Message, type MessageCursor, type MessageScope } from './types';
import { messageTransport, MessageRequestError, type MessageTransport } from './transport';

export interface ConversationState { messages: Message[]; cursor: MessageCursor | null; loaded: boolean; loadingOlder: boolean; error: string | null; readError: string | null }
export interface MessagingState { list: ConversationList | null; loading: boolean; error: string | null; conversations: Record<string, ConversationState> }
const empty = (): MessagingState => ({ list: null, loading: true, error: null, conversations: {} });
const emptyConversation = (): ConversationState => ({ messages: [], cursor: null, loaded: false, loadingOlder: false, error: null, readError: null });
const readableError = (error: unknown) => error instanceof Error ? error.message : 'Messages could not be refreshed. Retry to check them.';

/** One foreground polling owner shared by page and badges. No persisted message cache. */
export class MessageStore {
  private state = empty();
  private listeners = new Set<() => void>();
  private watched = new Map<string, number>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private abort = new AbortController();
  private refreshing: Promise<void> | null = null;
  private refreshAgain = false;
  private acknowledging = new Set<string>();
  private invalidScope(error: unknown) { return error instanceof MessageRequestError && ['ACCOUNT_CHANGED', 'STALE_RELATIONSHIP', 'STALE_RELATIONSHIP_SESSION', 'VALID_IDENTITY_REQUIRED', 'AUTHENTICATION_REQUIRED'].includes(error.code); }
  constructor(readonly scope: MessageScope, readonly api: MessageTransport) {}
  getSnapshot = () => this.state;
  private update(patch: Partial<MessagingState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()); }
  private conversation(id: string, patch: Partial<ConversationState>) {
    this.update({ conversations: { ...this.state.conversations, [id]: { ...(this.state.conversations[id] ?? emptyConversation()), ...patch } } });
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    if (this.listeners.size === 1) {
      this.abort = new AbortController();
      this.timer = setInterval(this.foregroundRefresh, 5000);
      document.addEventListener('visibilitychange', this.foregroundRefresh);
      window.addEventListener('focus', this.foregroundRefresh);
      window.addEventListener('online', this.foregroundRefresh);
      this.foregroundRefresh();
    }
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) {
        this.abort.abort(); this.refreshing = null; this.refreshAgain = false;
        if (this.timer) clearInterval(this.timer);
        document.removeEventListener('visibilitychange', this.foregroundRefresh);
        window.removeEventListener('focus', this.foregroundRefresh);
        window.removeEventListener('online', this.foregroundRefresh);
        this.state = empty(); this.acknowledging.clear();
      }
    };
  };
  private foregroundRefresh = () => { if (document.visibilityState === 'visible' && this.listeners.size) void this.refresh(); };
  watch = (id: string) => {
    this.watched.set(id, (this.watched.get(id) ?? 0) + 1); this.foregroundRefresh();
    return () => { const count = (this.watched.get(id) ?? 1) - 1; if (count) this.watched.set(id, count); else this.watched.delete(id); };
  };
  refresh = (): Promise<void> => {
    if (!this.listeners.size || document.visibilityState !== 'visible') return Promise.resolve();
    if (this.refreshing) { this.refreshAgain = true; return this.refreshing; }
    const signal = this.abort.signal;
    const work = async () => {
      try {
        const list = await this.api.list(this.scope, signal);
        if (signal.aborted) return;
        this.update({ list, loading: false, error: null });
        await Promise.all([...this.watched.keys()].filter(id => list.conversations.some(row => row.id === id)).map(async id => {
          try {
            const previous = this.state.conversations[id];
            const newest = previous?.messages[previous.messages.length - 1];
            const head = await this.api.page(this.scope, id, null, signal);
            let incoming = head.messages;
            let cursor = head.nextBefore;
            // Hidden tabs can miss more than one page between polls.
            while (newest && cursor && incoming.length && compareMessagePosition(incoming[0], newest) > 0) {
              const gap = await this.api.page(this.scope, id, cursor, signal);
              incoming = mergeMessages(gap.messages, incoming); cursor = gap.nextBefore;
            }
            if (signal.aborted) return;
            const current = this.state.conversations[id];
            this.conversation(id, { messages: mergeMessages(current?.messages ?? [], incoming), loaded: true, error: null, cursor: current?.loaded ? current.cursor : cursor });
          } catch (error) { if (!signal.aborted) {
            if (this.invalidScope(error)) this.update({ list: null, conversations: {}, loading: false, error: readableError(error) });
            else this.conversation(id, { error: readableError(error) });
          } }
        }));
      } catch (error) { if (!signal.aborted) this.update({ ...(this.invalidScope(error) ? { list: null, conversations: {} } : {}), loading: false, error: readableError(error) }); }
    };
    const request = work().finally(() => {
      if (signal.aborted) return;
      this.refreshing = null;
      if (this.refreshAgain) { this.refreshAgain = false; this.foregroundRefresh(); }
    });
    this.refreshing = request;
    return request;
  };
  loadOlder = async (id: string) => {
    const previous = this.state.conversations[id];
    if (!previous?.cursor || previous.loadingOlder) return;
    const signal = this.abort.signal;
    this.conversation(id, { loadingOlder: true, error: null });
    try {
      const page = await this.api.page(this.scope, id, previous.cursor, signal);
      if (!signal.aborted) this.conversation(id, { messages: mergeMessages(page.messages, this.state.conversations[id]?.messages ?? []), cursor: page.nextBefore });
    } catch (error) { if (!signal.aborted) this.conversation(id, { error: readableError(error) }); }
    finally { if (!signal.aborted) this.conversation(id, { loadingOlder: false }); }
  };
  acknowledge = async (id: string, displayedIds: string[]) => {
    if (document.visibilityState !== 'visible') return;
    const incoming = this.state.conversations[id]?.messages ?? [];
    const ids = [...new Set(displayedIds)].filter(messageId => !this.acknowledging.has(messageId) && incoming.some(row => row.id === messageId && row.author === 'partner' && row.readStatus !== 'read'));
    if (!ids.length) return;
    const signal = this.abort.signal;
    ids.forEach(messageId => this.acknowledging.add(messageId));
    try {
      const result = await this.api.acknowledge(this.scope, id, ids, signal);
      if (signal.aborted) return;
      this.conversation(id, { messages: (this.state.conversations[id]?.messages ?? []).map(row => result.acknowledgedMessageIds.includes(row.id) ? { ...row, readAt: result.acknowledgedAt, readStatus: 'read' } : row), readError: null });
      void this.refresh();
    } catch { if (!signal.aborted) this.conversation(id, { readError: 'Read status could not be confirmed. Unread counts have not been cleared. Retry read status.' }); }
    finally { ids.forEach(messageId => this.acknowledging.delete(messageId)); }
  };
}
const stores = new Map<string, MessageStore>();
export function getMessageStore(scope: MessageScope): MessageStore {
  const key = messageScopeKey(scope);
  if (!stores.has(key)) stores.set(key, new MessageStore(scope, messageTransport));
  return stores.get(key)!;
}
