import { vi } from 'vitest';
import type { ConversationSummary, Message, MessageScope, MessageReceipt, MessagePage } from '@/data/messages/types';
import type { MessageTransport } from '@/data/messages/transport';
import type { DraftRepository, MessageDraft } from '@/data/messages/drafts';
export const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;
export const scope: MessageScope = { backendId: 'https://backend.invalid', accountId: uuid(1), relationshipId: uuid(2), relationshipSessionId: uuid(3) };
export const conversation: ConversationSummary = { id: uuid(4), kind: 'pair', state: 'current', startedAt: '2026-10-27T00:00:00Z', endedAt: null, lastMessageAt: null, canSend: true, label: 'Partner', partnerAvatarUrl: null, unreadCount: 2 };
export const message = (n = 10, patch: Partial<Message> = {}): Message => ({ id: uuid(n), content: `Synthetic ${n}`, createdAt: `2026-10-27T01:00:${(n % 60).toString().padStart(2, '0')}Z`, author: 'partner', attachment: null, readAt: null, readStatus: 'unread', provenance: 'native', ...patch });
export const receipt = (commandId: string, patch: Partial<MessageReceipt> = {}): MessageReceipt => ({ commandId, conversationId: conversation.id, messageId: uuid(90), confirmedAt: '2026-10-27T02:00:00Z', ...patch });
export const page = (messages: Message[], nextBefore: MessagePage['nextBefore'] = null): MessagePage => ({ conversation, messages, nextBefore });
export function apiFixture() {
  return {
    list: vi.fn(async () => ({ currentConversationId: conversation.id, conversations: [conversation] })),
    page: vi.fn(async () => page([message()])),
    send: vi.fn(async (_scope, intent) => receipt(intent.commandId)),
    receipt: vi.fn(async () => null),
    acknowledge: vi.fn(async (_scope, _conversation, ids) => ({ acknowledgedMessageIds: ids, acknowledgedAt: '2026-10-27T03:00:00Z' })),
    upload: vi.fn(async () => ({ attachmentId: uuid(80), mimeType: 'image/png' as const, byteSize: 3, status: 'ready' as const })),
    image: vi.fn(async () => new Blob(['abc'], { type: 'image/png' })),
  } satisfies MessageTransport;
}
export function repositoryFixture() {
  const rows = new Map<string, MessageDraft>();
  const repo: DraftRepository = {
    get: vi.fn(async key => rows.get(key) ?? null),
    put: vi.fn(async draft => { rows.set(draft.key, { ...draft }); }),
    remove: vi.fn(async key => { rows.delete(key); }),
    list: vi.fn(async (accountId, backendId) => [...rows.values()].filter(row => row.scope.accountId === accountId && row.scope.backendId === backendId)),
  };
  return { rows, repo };
}
export function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
export const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
