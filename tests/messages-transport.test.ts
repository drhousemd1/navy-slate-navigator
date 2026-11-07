import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://backend.invalid', supabase: { auth: { getSession: vi.fn() } } }));
import { createMessageTransport } from '@/data/messages/transport';
import { decodeMessagePage, mergeMessages } from '@/data/messages/types';
import { conversation, scope, uuid, message, page, receipt, deferred } from './messages.helpers';

const fixture = () => {
  const session = vi.fn(async () => ({ accountId: scope.accountId, token: 'checked-A' }));
  const rpc = vi.fn(async () => ({ data: { currentConversationId: conversation.id, conversations: [conversation] } as unknown, error: null as { message: string } | null, status: 200 }));
  const fetch = vi.fn();
  return { session, rpc, fetch, api: createMessageTransport({ backendId: scope.backendId, session, rpc, fetch, timeoutMs: 100 }) };
};
afterEach(() => vi.useRealTimers());
describe('private messaging transport', () => {
  it('pins the checked actor token, period and generation without caller recipient IDs', async () => {
    const f = fixture(); await f.api.list(scope);
    expect(f.rpc).toHaveBeenCalledWith('get_my_conversations', { p_expected_relationship_id: scope.relationshipId, p_expected_relationship_session_id: scope.relationshipSessionId }, 'checked-A', expect.any(AbortSignal));
    const intent = { commandId: uuid(5), conversationId: conversation.id, content: 'Synthetic', attachmentId: null };
    f.rpc.mockResolvedValue({ data: receipt(intent.commandId), error: null, status: 200 }); await f.api.send(scope, intent);
    expect(f.rpc.mock.calls[1][1]).toEqual({ p_expected_relationship_id: scope.relationshipId, p_expected_relationship_session_id: scope.relationshipSessionId, p_command_id: uuid(5), p_conversation_id: conversation.id, p_content: 'Synthetic', p_attachment_id: null });
  });
  it('does not send after account changes during session lookup', async () => {
    const f = fixture(); f.session.mockResolvedValue({ accountId: uuid(99), token: 'B' });
    await expect(f.api.list(scope)).rejects.toMatchObject({ code: 'ACCOUNT_CHANGED' }); expect(f.rpc).not.toHaveBeenCalled();
  });
  it('rejects an old-account response after the checked request', async () => {
    const f = fixture(); f.session.mockResolvedValueOnce({ accountId: scope.accountId, token: 'A' }).mockResolvedValue({ accountId: uuid(99), token: 'B' });
    await expect(f.api.list(scope)).rejects.toMatchObject({ code: 'ACCOUNT_CHANGED' });
  });
  it('bounds a never-settling write and distinguishes unknown delivery from rejection', async () => {
    vi.useFakeTimers(); const f = fixture(); f.rpc.mockImplementation(() => new Promise(() => {}));
    const work = f.api.send(scope, { commandId: uuid(5), conversationId: conversation.id, content: 'Synthetic', attachmentId: null });
    const assertion = expect(work).rejects.toMatchObject({ outcome: 'unknown' }); await vi.advanceTimersByTimeAsync(101); await assertion;
    f.rpc.mockResolvedValue({ data: null, error: { message: 'CONVERSATION_READ_ONLY' }, status: 400 });
    await expect(f.api.send(scope, { commandId: uuid(5), conversationId: conversation.id, content: 'Synthetic', attachmentId: null })).rejects.toMatchObject({ outcome: 'rejected' });
  });
  it('receipt recovery is bound only to the original account and command, not the new period', async () => {
    const f = fixture(); f.rpc.mockResolvedValue({ data: receipt(uuid(5)), error: null, status: 200 });
    await f.api.receipt(scope.accountId, uuid(5));
    expect(f.rpc).toHaveBeenCalledWith('get_my_message_receipt', { p_command_id: uuid(5) }, 'checked-A', expect.any(AbortSignal));
    f.rpc.mockResolvedValue({ data: receipt(uuid(6)), error: null, status: 200 }); await expect(f.api.receipt(scope.accountId, uuid(5))).rejects.toThrow();
  });
  it('rejects former identity and raw Auth fields from archive DTOs', async () => {
    const f = fixture();
    for (const change of [{ label: 'Former name' }, { label: 'Former partner', partnerAvatarUrl: 'https://example.invalid/profile' }, { label: 'Former partner', sender_id: uuid(1) }]) {
      f.rpc.mockResolvedValue({ data: { currentConversationId: null, conversations: [{ ...conversation, state: 'archived', canSend: false, ...change }] }, error: null, status: 200 });
      await expect(f.api.list(scope)).rejects.toThrow();
    }
  });
  it('fetches authenticated image bytes without a storage URL and rejects an account switch', async () => {
    const f = fixture(); f.fetch.mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } }));
    expect((await f.api.image(scope, uuid(80))).size).toBe(3);
    expect(f.fetch).toHaveBeenCalledWith(`https://backend.invalid/functions/v1/message-media/${uuid(80)}`, expect.objectContaining({ headers: { Authorization: 'Bearer checked-A' }, cache: 'no-store' }));
    f.session.mockResolvedValue({ accountId: uuid(99), token: 'B' }); await expect(f.api.image(scope, uuid(80))).rejects.toThrow(); expect(f.fetch).toHaveBeenCalledTimes(1);
  });
  it('uploads the original Blob under a stable upload ID and never accepts an unverified reply', async () => {
    const f = fixture(); f.fetch.mockResolvedValue(new Response(JSON.stringify({ attachmentId: uuid(80), mimeType: 'image/png', byteSize: 3, status: 'ready' }), { status: 200 }));
    await f.api.upload(scope, uuid(81), new Blob(['abc'], { type: 'image/png' }), 'photo.png');
    const body = f.fetch.mock.calls[0][1].body as FormData;
    expect(body.get('uploadId')).toBe(uuid(81)); expect(body.get('expectedRelationshipSessionId')).toBe(scope.relationshipSessionId); expect((body.get('file') as File).size).toBe(3);
    f.fetch.mockResolvedValue(new Response(JSON.stringify({ attachmentId: uuid(80), mimeType: 'image/png', byteSize: 9, status: 'ready' }), { status: 200 }));
    await expect(f.api.upload(scope, uuid(81), new Blob(['abc'], { type: 'image/png' }), 'photo.png')).rejects.toThrow();
  });
});
describe('timestamp and ID paging', () => {
  it('preserves older loaded messages and sorts equal timestamps by ID without duplicates', () => {
    const at = '2026-10-27T01:00:00.000001+00:00';
    const rows = mergeMessages([message(10, { createdAt: at }), message(11, { createdAt: at })], [message(11, { createdAt: at }), message(12, { createdAt: '2026-10-27T01:00:00.000002+00:00' })]);
    expect(rows.map(row => row.id)).toEqual([uuid(10), uuid(11), uuid(12)]);
  });
  it('does not regress an acknowledged read when an older polling response arrives', () => {
    const readAt = '2026-10-27T03:00:00Z';
    expect(mergeMessages([message(10, { readAt, readStatus: 'read' })], [message(10)])[0]).toMatchObject({ readAt, readStatus: 'read' });
  });
  it('checks conversation, cursor boundaries, duplicate rows and self-message ownership', () => {
    const row = message(); const cursor = { createdAt: row.createdAt, messageId: row.id };
    expect(() => decodeMessagePage(page([row]), uuid(99), null)).toThrow();
    expect(() => decodeMessagePage(page([row]), conversation.id, cursor)).toThrow();
    expect(() => decodeMessagePage(page([row, row]), conversation.id, null)).toThrow();
    expect(() => decodeMessagePage({ ...page([row]), conversation: { ...conversation, kind: 'legacy_self', label: 'Saved self-messages', canSend: false } }, conversation.id, null)).toThrow();
  });
});
