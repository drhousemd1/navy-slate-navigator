import { z } from 'zod';

export interface MessageScope { backendId: string; accountId: string; relationshipId: string; relationshipSessionId: string }
export const messageScopeKey = (scope: MessageScope) => JSON.stringify([scope.backendId, scope.accountId, scope.relationshipId, scope.relationshipSessionId]);
const uuid = z.string().uuid();
const timestamp = z.string().refine(value => /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)), 'Invalid timestamp');
export const cursorSchema = z.object({ createdAt: timestamp, messageId: uuid }).strict();
export const conversationSchema = z.object({
  id: uuid, kind: z.enum(['pair', 'legacy_self']), state: z.enum(['current', 'archived']),
  startedAt: timestamp, endedAt: timestamp.nullable(), lastMessageAt: timestamp.nullable(), canSend: z.boolean(),
  label: z.string().min(1), partnerAvatarUrl: z.string().url().nullable(), unreadCount: z.number().int().nonnegative(),
}).strict().superRefine((value, ctx) => {
  if (value.state === 'archived' && (value.partnerAvatarUrl !== null || !['Former partner', 'Deleted account', 'Saved self-messages'].includes(value.label))) ctx.addIssue({ code: 'custom', message: 'Invalid archive identity' });
  if ((value.state === 'archived' || value.kind === 'legacy_self') && value.canSend) ctx.addIssue({ code: 'custom', message: 'Invalid conversation permission' });
  if (value.kind === 'legacy_self' && (value.label !== 'Saved self-messages' || value.partnerAvatarUrl !== null)) ctx.addIssue({ code: 'custom', message: 'Invalid self conversation' });
});
export const messageSchema = z.object({
  id: uuid, createdAt: timestamp, author: z.enum(['you', 'partner']), content: z.string().nullable(),
  attachment: z.object({ id: uuid, mimeType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']), byteSize: z.number().int().positive().max(5 * 1024 * 1024) }).strict().nullable(),
  readAt: timestamp.nullable(), readStatus: z.enum(['unread', 'read', 'unknown']), provenance: z.enum(['native', 'legacy_messages', 'legacy_archive']),
}).strict();
export const conversationsSchema = z.object({ currentConversationId: uuid.nullable(), conversations: z.array(conversationSchema) }).strict().superRefine((value, ctx) => {
  if (new Set(value.conversations.map(row => row.id)).size !== value.conversations.length || (value.currentConversationId !== null && !value.conversations.some(row => row.id === value.currentConversationId && row.state === 'current' && row.kind === 'pair'))) ctx.addIssue({ code: 'custom', message: 'Invalid conversation list' });
});
export const pageSchema = z.object({ conversation: conversationSchema, messages: z.array(messageSchema).max(100), nextBefore: cursorSchema.nullable() }).strict();
export const receiptSchema = z.object({ commandId: uuid, conversationId: uuid, messageId: uuid, confirmedAt: timestamp }).strict();
export const ackSchema = z.object({ acknowledgedMessageIds: z.array(uuid), acknowledgedAt: timestamp }).strict();
export const uploadSchema = z.object({ attachmentId: uuid, mimeType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']), byteSize: z.number().int().positive().max(5 * 1024 * 1024), status: z.literal('ready') }).strict();
export type ConversationSummary = Required<z.infer<typeof conversationSchema>>;
export type Message = Required<z.infer<typeof messageSchema>>;
export type MessageCursor = Required<z.infer<typeof cursorSchema>>;
export interface MessagePage { conversation: ConversationSummary; messages: Message[]; nextBefore: MessageCursor | null }
export interface ConversationList { currentConversationId: string | null; conversations: ConversationSummary[] }
export type MessageReceipt = Required<z.infer<typeof receiptSchema>>;
export interface SendIntent { commandId: string; conversationId: string; content: string; attachmentId: string | null }

// Date alone loses PostgreSQL sub-millisecond precision, which matters for cursors.
function timestampOrder(value: string): bigint {
  const fraction = value.match(/\.(\d+)/)?.[1] ?? '';
  return BigInt(Date.parse(value)) * 1_000_000n + BigInt(fraction.padEnd(9, '0').slice(3, 9) || '0');
}
export function compareMessagePosition(a: { createdAt: string; id: string }, b: { createdAt: string; id: string }): number {
  const delta = timestampOrder(a.createdAt) - timestampOrder(b.createdAt);
  return delta < 0 ? -1 : delta > 0 ? 1 : a.id.localeCompare(b.id);
}
export function mergeMessages(previous: readonly Message[], incoming: readonly Message[]): Message[] {
  const rows = new Map(previous.map(message => [message.id, message]));
  incoming.forEach(message => {
    const known = rows.get(message.id);
    // A poll begun before an acknowledgment must not turn a confirmed read back
    // into an unread message when its older response arrives afterward.
    rows.set(message.id, known?.readAt && !message.readAt ? { ...message, readAt: known.readAt, readStatus: 'read' } : message);
  });
  return [...rows.values()].sort(compareMessagePosition);
}
export function decodeMessagePage(value: unknown, conversationId: string, before: MessageCursor | null): MessagePage {
  const page = pageSchema.parse(value) as MessagePage;
  if (page.conversation.id !== conversationId || new Set(page.messages.map(row => row.id)).size !== page.messages.length ||
    page.messages.some((row, index) => (index > 0 && compareMessagePosition(page.messages[index - 1], row) >= 0) ||
      (before && compareMessagePosition(row, { createdAt: before.createdAt, id: before.messageId }) >= 0)) ||
    (page.conversation.kind === 'legacy_self' && page.messages.some(row => row.author !== 'you'))) throw new Error('INVALID_MESSAGE_PAGE');
  if (page.nextBefore && (!page.messages.length || page.nextBefore.messageId !== page.messages[0].id || page.nextBefore.createdAt !== page.messages[0].createdAt)) throw new Error('INVALID_MESSAGE_CURSOR');
  return page;
}
