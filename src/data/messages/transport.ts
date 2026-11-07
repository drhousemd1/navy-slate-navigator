import { supabase, supabaseBackendId } from '@/integrations/supabase/client';
import { ackSchema, conversationsSchema, decodeMessagePage, receiptSchema, uploadSchema, type MessageCursor, type MessageScope, type SendIntent, type ConversationList, type MessageReceipt } from './types';

export class MessageRequestError extends Error {
  constructor(public readonly outcome: 'not_sent' | 'rejected' | 'unknown', message: string, public readonly code = 'REQUEST_FAILED') { super(message); }
}
const errorMessages: Record<string, string> = {
  STALE_RELATIONSHIP_SESSION: 'Your connection changed. Reload Messages before continuing.',
  STALE_RELATIONSHIP: 'Your connection changed. Reload Messages before continuing.',
  CONVERSATION_READ_ONLY: 'This conversation is read-only.', CONVERSATION_NOT_CURRENT: 'This conversation is read-only.',
  CONVERSATION_NOT_SENDABLE: 'This conversation is read-only.', MESSAGE_PARTNER_REQUIRED: 'Connect with your partner before sending a message.',
  VALID_IDENTITY_REQUIRED: 'Your connection could not be verified. Reload Messages.', AUTHENTICATION_REQUIRED: 'Sign in again to load Messages.',
  CONVERSATION_NOT_FOUND: 'This conversation is no longer available to this account.',
  MESSAGE_CONTENT_INVALID: 'Enter text of at most 10,000 characters or select an image.',
  MESSAGE_COMMAND_ID_REUSED: 'The saved request does not match its original message. Check delivery before creating a new message.',
  MESSAGE_ATTACHMENT_UNAVAILABLE: 'The selected image is not ready for this conversation. Your draft is retained.',
  IMAGE_TYPE_UNSUPPORTED: 'Choose a JPEG, PNG, GIF or WebP image.', IMAGE_TOO_LARGE: 'Choose an image smaller than 5 MiB.',
  MESSAGE_EMPTY: 'Enter a message or choose an image.', ATTACHMENT_NOT_READY: 'The image upload has not been confirmed. Retry the same message.',
};
export interface MessagingDependencies {
  backendId: string;
  session: () => Promise<{ accountId: string; token: string } | null>;
  rpc: (name: string, args: Record<string, unknown>, token: string, signal: AbortSignal) => Promise<{ data: unknown; error: { message: string; code?: string } | null; status?: number }>;
  fetch: typeof fetch;
  timeoutMs?: number;
}
export function createMessageTransport(deps: MessagingDependencies) {
  async function bounded<T>(operation: (signal: AbortSignal) => Promise<T>, outer?: AbortSignal): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    outer?.addEventListener('abort', abort, { once: true });
    if (outer?.aborted) controller.abort();
    let timer: ReturnType<typeof setTimeout>;
    try {
      return await Promise.race([operation(controller.signal), new Promise<never>((_, reject) => {
        const rejectAbort = () => reject(new Error('REQUEST_INTERRUPTED'));
        controller.signal.addEventListener('abort', rejectAbort, { once: true });
        if (controller.signal.aborted) rejectAbort();
        timer = setTimeout(() => { controller.abort(); reject(new Error('REQUEST_TIMEOUT')); }, deps.timeoutMs ?? 12000);
      })]);
    } finally { clearTimeout(timer!); outer?.removeEventListener('abort', abort); controller.abort(); }
  }
  async function checkedToken(accountId: string, signal: AbortSignal): Promise<string> {
    const session = await deps.session();
    if (signal.aborted) throw new MessageRequestError('not_sent', 'The request was cancelled. Your draft is retained.');
    if (!session?.token || session.accountId !== accountId) throw new MessageRequestError('not_sent', 'The signed-in account changed. Sign in to the original account to check this message.', 'ACCOUNT_CHANGED');
    return session.token;
  }
  function scopeArgs(scope: MessageScope) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (scope.backendId !== deps.backendId || !uuid.test(scope.accountId) || !uuid.test(scope.relationshipId) || !uuid.test(scope.relationshipSessionId)) throw new MessageRequestError('not_sent', 'Your connection could not be verified. Reload Messages.');
    return { p_expected_relationship_id: scope.relationshipId, p_expected_relationship_session_id: scope.relationshipSessionId };
  }
  async function call<T>(accountId: string, name: string, args: Record<string, unknown>, decode: (value: unknown) => T, write = false, signal?: AbortSignal): Promise<T> {
    let started = false;
    try {
      return await bounded(async abort => {
        const token = await checkedToken(accountId, abort);
        if (abort.aborted) throw new Error('REQUEST_INTERRUPTED');
        started = true;
        const response = await deps.rpc(name, args, token, abort);
        if (response.error) {
          // Transport failures may have happened after a committed write.
          const rejected = response.status && response.status >= 400 && response.status < 500 && response.status !== 408;
          throw new MessageRequestError(write && !rejected ? 'unknown' : 'rejected', errorMessages[response.error.message] ?? (write ? 'The message request was not accepted. Your draft is retained.' : 'Messages could not be loaded. Retry to refresh them.'), response.error.message);
        }
        const result = decode(response.data);
        await checkedToken(accountId, abort);
        return result;
      }, signal);
    } catch (error) {
      if (error instanceof MessageRequestError && !(write && started && error.outcome === 'not_sent')) throw error;
      throw new MessageRequestError(write && started ? 'unknown' : 'not_sent', write && started ? 'Delivery could not be confirmed. Check delivery before editing or retrying this message.' : 'Messages could not be reached. Your saved draft is retained.');
    }
  }
  const list = (scope: MessageScope, signal?: AbortSignal) => call(scope.accountId, 'get_my_conversations', scopeArgs(scope), value => conversationsSchema.parse(value) as ConversationList, false, signal);
  const page = (scope: MessageScope, conversationId: string, before: MessageCursor | null = null, signal?: AbortSignal) => call(scope.accountId, 'get_conversation_messages', {
    ...scopeArgs(scope), p_conversation_id: conversationId, p_before_created_at: before?.createdAt ?? null, p_before_message_id: before?.messageId ?? null, p_limit: 25,
  }, value => decodeMessagePage(value, conversationId, before), false, signal);
  const send = (scope: MessageScope, intent: SendIntent) => call(scope.accountId, 'send_message', {
    ...scopeArgs(scope), p_command_id: intent.commandId, p_conversation_id: intent.conversationId, p_content: intent.content, p_attachment_id: intent.attachmentId,
  }, value => {
    const receipt = receiptSchema.parse(value) as MessageReceipt;
    if (receipt.commandId !== intent.commandId || receipt.conversationId !== intent.conversationId) throw new Error('INVALID_MESSAGE_RECEIPT');
    return receipt;
  }, true);
  const receipt = (accountId: string, commandId: string) => call(accountId, 'get_my_message_receipt', { p_command_id: commandId }, value => {
    if (value === null) return null;
    const result = receiptSchema.parse(value) as MessageReceipt;
    if (result.commandId !== commandId) throw new Error('INVALID_MESSAGE_RECEIPT');
    return result;
  });
  const acknowledge = (scope: MessageScope, conversationId: string, ids: string[], signal?: AbortSignal) => call(scope.accountId, 'acknowledge_conversation_messages', {
    ...scopeArgs(scope), p_conversation_id: conversationId, p_message_ids: ids,
  }, value => {
    const result = ackSchema.parse(value);
    if (result.acknowledgedMessageIds.some(id => !ids.includes(id))) throw new Error('INVALID_READ_ACKNOWLEDGMENT');
    return result;
  }, false, signal);
  async function upload(scope: MessageScope, uploadId: string, file: Blob, fileName: string) {
    scopeArgs(scope);
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) throw new MessageRequestError('not_sent', 'Choose a JPEG, PNG, GIF or WebP image smaller than 5 MiB.');
    return bounded(async signal => {
      const token = await checkedToken(scope.accountId, signal);
      const form = new FormData();
      form.append('uploadId', uploadId); form.append('expectedRelationshipId', scope.relationshipId); form.append('expectedRelationshipSessionId', scope.relationshipSessionId); form.append('file', file, fileName);
      const response = await deps.fetch(`${deps.backendId}/functions/v1/message-media`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form, signal });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new MessageRequestError('not_sent', errorMessages[payload?.error?.code] ?? 'The image upload could not be confirmed. Your message and image are retained.', payload?.error?.code);
      }
      const result = uploadSchema.parse(await response.json());
      if (result.byteSize !== file.size || result.mimeType !== file.type) throw new Error('INVALID_IMAGE_RECEIPT');
      await checkedToken(scope.accountId, signal);
      return result;
    });
  }
  async function image(scope: MessageScope, attachmentId: string, signal?: AbortSignal): Promise<Blob> {
    scopeArgs(scope);
    return bounded(async abort => {
      const token = await checkedToken(scope.accountId, abort);
      const response = await deps.fetch(`${deps.backendId}/functions/v1/message-media/${encodeURIComponent(attachmentId)}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: abort });
      if (!response.ok || !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(response.headers.get('Content-Type')?.split(';')[0] ?? '')) throw new Error('This image could not be loaded. Retry to view it.');
      const blob = await response.blob();
      if (!blob.size || blob.size > 5 * 1024 * 1024) throw new Error('This image could not be verified.');
      await checkedToken(scope.accountId, abort);
      return blob;
    }, signal);
  }
  return { list, page, send, receipt, acknowledge, upload, image };
}
export type MessageTransport = ReturnType<typeof createMessageTransport>;
export const messageTransport = createMessageTransport({
  backendId: supabaseBackendId,
  session: async () => { const { data: { session }, error } = await supabase.auth.getSession(); return error || !session ? null : { accountId: session.user.id, token: session.access_token }; },
  rpc: async (name, args, token, signal) => {
    const database = supabase as any; // Forward RPC boundary until generated types include the migration.
    return await database.rpc(name, args).setHeader('Authorization', `Bearer ${token}`).abortSignal(signal);
  },
  fetch: (input, init) => fetch(input, init),
});
