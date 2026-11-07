import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://backend.invalid', supabase: { auth: { getSession: vi.fn() } } }));
import { MessageStore } from '@/data/messages/store';
import { MessageRequestError } from '@/data/messages/transport';
import { apiFixture, conversation, deferred, flush, message, page, scope, uuid } from './messages.helpers';
const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).forEach(stop => stop()); vi.useRealTimers(); vi.restoreAllMocks(); });
const start = (api = apiFixture()) => { const store = new MessageStore(scope, api); cleanup.push(store.subscribe(vi.fn())); return { api, store }; };
describe('one scoped message polling owner', () => {
  it('shares one poll across badge/page consumers and stops while hidden and after unmount', async () => {
    vi.useFakeTimers(); const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const { api, store } = start(); const stopSecond = store.subscribe(vi.fn()); cleanup.push(stopSecond); await flush(); expect(api.list).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000); expect(api.list).toHaveBeenCalledTimes(2);
    visibility.mockReturnValue('hidden'); await vi.advanceTimersByTimeAsync(10000); expect(api.list).toHaveBeenCalledTimes(2);
    visibility.mockReturnValue('visible'); document.dispatchEvent(new Event('visibilitychange')); await flush(); expect(api.list).toHaveBeenCalledTimes(3);
    cleanup.splice(0).forEach(stop => stop()); await vi.advanceTimersByTimeAsync(5000); expect(api.list).toHaveBeenCalledTimes(3); expect(store.getSnapshot().list).toBeNull();
  });
  it('never installs a late old-scope list after its last consumer leaves', async () => {
    const api = apiFixture(); const pending = deferred<Awaited<ReturnType<typeof api.list>>>(); api.list.mockReturnValue(pending.promise);
    const { store } = start(api); cleanup.splice(0).forEach(stop => stop()); pending.resolve({ currentConversationId: conversation.id, conversations: [conversation] }); await flush(); expect(store.getSnapshot().list).toBeNull();
  });
  it('retains the last confirmed unread count on network failure, but masks old identity on stale generation', async () => {
    const { api, store } = start(); await flush(); expect(store.getSnapshot().list?.conversations[0].unreadCount).toBe(2);
    api.list.mockRejectedValue(new Error('Offline')); await store.refresh(); expect(store.getSnapshot().list?.conversations[0].unreadCount).toBe(2); expect(store.getSnapshot().error).toBe('Offline');
    api.list.mockRejectedValue(new MessageRequestError('rejected', 'Connection changed', 'STALE_RELATIONSHIP_SESSION')); await store.refresh(); expect(store.getSnapshot().list).toBeNull();
  });
  it('retains older pages and fills a new-message gap larger than the latest page', async () => {
    const api = apiFixture(); api.page.mockResolvedValue(page([message(20), message(21)], { createdAt: message(20).createdAt, messageId: uuid(20) }));
    const { store } = start(api); cleanup.push(store.watch(conversation.id)); await flush();
    api.page.mockResolvedValueOnce(page([message(10), message(11)])); await store.loadOlder(conversation.id);
    api.page.mockImplementation(async (_scope, _id, before) => before ? page([message(21), message(22)]) : page([message(30), message(31)], { createdAt: message(30).createdAt, messageId: uuid(30) }));
    await store.refresh();
    expect(store.getSnapshot().conversations[conversation.id].messages.map(row => row.id)).toEqual([10, 11, 20, 21, 22, 30, 31].map(uuid));
    expect(store.getSnapshot().conversations[conversation.id].cursor).toBeNull();
  });
  it('acknowledges only displayed incoming IDs, never hidden documents, and does not zero counts on errors', async () => {
    const api = apiFixture(); api.page.mockResolvedValue(page([message(10), message(11), message(12, { author: 'you' })]));
    const { store } = start(api); cleanup.push(store.watch(conversation.id)); await flush();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden'); await store.acknowledge(conversation.id, [uuid(10)]); expect(api.acknowledge).not.toHaveBeenCalled();
    visibility.mockReturnValue('visible'); api.acknowledge.mockRejectedValueOnce(new Error('Offline')); await store.acknowledge(conversation.id, [uuid(10), uuid(12), uuid(99)]);
    expect(api.acknowledge).toHaveBeenCalledWith(scope, conversation.id, [uuid(10)], expect.any(AbortSignal)); expect(store.getSnapshot().conversations[conversation.id].readError).toBeTruthy(); expect(store.getSnapshot().list?.conversations[0].unreadCount).toBe(2);
    await store.acknowledge(conversation.id, [uuid(10)]); expect(store.getSnapshot().conversations[conversation.id].messages.find(row => row.id === uuid(11))?.readStatus).toBe('unread');
  });
});
