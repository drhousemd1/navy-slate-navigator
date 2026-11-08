vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: mocks.theme }) }));
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://backend.invalid', supabase: { auth: { getSession: vi.fn() } } }));
const mocks = vi.hoisted(() => ({ theme: 'default', api: null as any, repo: null as any }));
vi.mock('@/data/messages/transport', async original => ({ ...await original<typeof import('@/data/messages/transport')>(), messageTransport: new Proxy({}, { get: (_target, name) => mocks.api[name] }) }));
vi.mock('@/data/messages/drafts', async original => ({ ...await original<typeof import('@/data/messages/drafts')>(), messageDraftRepository: () => mocks.repo }));
import MessageInput from '@/components/messages/MessageInput';
import MessageComposer from '@/components/messages/MessageComposer';
import MessageItem from '@/components/messages/MessageItem';
import EarlierMessageDrafts from '@/components/messages/EarlierMessageDrafts';
import { emptyMessageDraft } from '@/data/messages/drafts';
import { MessageRequestError } from '@/data/messages/transport';
import { apiFixture, conversation, deferred, flush, message, receipt, repositoryFixture, scope, uuid } from './messages.helpers';

beforeEach(() => {
  mocks.theme = 'default'; mocks.api = apiFixture(); mocks.repo = repositoryFixture().repo;
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:synthetic-private') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});
afterEach(cleanup);
describe('actual message composer and image controls', () => {
  it('preserves original bubble, timestamp and input colors across theme switches', () => {
    mocks.theme = 'light-turquoise';
    const tree = () => <><MessageInput message="Draft" setMessage={vi.fn()} imageFile={null} setImageFile={vi.fn()} handleSendMessage={vi.fn()} isUploading={false} />
      <MessageItem message={message(10, { content: 'Incoming text' })} scope={scope} conversation={conversation} onImageLoad={vi.fn()} />
      <MessageItem message={message(11, { author: 'you', content: 'Outgoing text' })} scope={scope} conversation={conversation} onImageLoad={vi.fn()} /></>;
    const view = render(tree());
    expect(screen.getByRole('textbox', { name: 'Message' }).className).toContain('text-white');
    expect(screen.getByRole('textbox', { name: 'Message' }).className).toContain('placeholder:text-gray-500');
    expect(screen.getByRole('button', { name: 'Send message' }).className).toContain('text-primary-foreground');
    expect(screen.getByRole('button', { name: 'Send message' }).className).toContain('bg-cyan-700');
    expect(screen.getByText('Incoming text').parentElement!.className).toContain('text-white');
    expect(screen.getByText('Outgoing text').parentElement!.className).toContain('bg-cyan-800 text-white');
    expect(document.querySelector('time')!.parentElement!.className).toContain('opacity-40');
    mocks.theme = 'default'; view.rerender(tree());
    expect(screen.getByRole('textbox', { name: 'Message' }).className).toContain('text-white');
    expect(screen.getByRole('textbox', { name: 'Message' }).className).toContain('placeholder:text-gray-500');
    expect(screen.getByText('Incoming text').parentElement!.className).toContain('text-white');
    expect(document.querySelector('time')!.parentElement!.className).toContain('text-white opacity-40');
    expect(screen.getByRole('button', { name: 'Send message' }).className).toContain('text-primary-foreground');
  });
  it('keeps text after upload failure and exposes a useful file error without throwing', async () => {
    render(<MessageComposer scope={scope} conversationId={conversation.id} canSend confirmed={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: 'Message' }); await waitFor(() => expect((input as HTMLInputElement).disabled).toBe(false));
    fireEvent.change(input, { target: { value: 'retained text' } });
    fireEvent.change(screen.getByLabelText('Message image'), { target: { files: [new File(['abc'], 'photo.png', { type: 'image/png' })] } });
    mocks.api.upload.mockRejectedValue(new Error('Image unavailable')); fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByText('Image unavailable'); expect((input as HTMLInputElement).value).toBe('retained text'); expect(screen.getByAltText('Image preview')).toBeTruthy(); expect(mocks.api.send).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Message image'), { target: { files: [new File(['bad'], 'bad.svg', { type: 'image/svg+xml' })] } });
    expect(screen.getByText(/Choose a JPEG, PNG, GIF or WebP/)).toBeTruthy(); expect(screen.getByAltText('Image preview')).toBeTruthy();
  });
  it('locks an uncertain message, retains it across remount, and checks its receipt before clearing', async () => {
    const confirmed = vi.fn(); const view = render(<MessageComposer scope={scope} conversationId={conversation.id} canSend confirmed={confirmed} />);
    const input = screen.getByRole('textbox', { name: 'Message' }); await waitFor(() => expect((input as HTMLInputElement).disabled).toBe(false));
    fireEvent.change(input, { target: { value: 'uncertain message' } });
    mocks.api.send.mockRejectedValue(new MessageRequestError('unknown', 'Delivery not confirmed')); fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByRole('button', { name: 'Check delivery' }); await waitFor(() => expect((screen.getByRole('button', { name: 'Check delivery' }) as HTMLButtonElement).disabled).toBe(false));
    expect((input as HTMLInputElement).value).toBe('uncertain message'); expect((input as HTMLInputElement).disabled).toBe(true);
    const intent = mocks.api.send.mock.calls[0][1]; view.unmount();
    render(<MessageComposer scope={scope} conversationId={conversation.id} canSend confirmed={confirmed} />);
    await screen.findByRole('button', { name: 'Check delivery' }); expect(mocks.api.send).toHaveBeenCalledTimes(1);
    mocks.api.receipt.mockResolvedValue(receipt(intent.commandId)); fireEvent.click(screen.getByRole('button', { name: 'Check delivery' }));
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Message' }) as HTMLInputElement).value).toBe('')); expect(confirmed).toHaveBeenCalledOnce();
  });
  it('restores a complete scoped draft including its Blob without clearing on shell unmount', async () => {
    const saved = { ...emptyMessageDraft(scope, conversation.id), text: 'saved text', image: new Blob(['abc'], { type: 'image/png' }), imageName: 'saved.png' };
    await mocks.repo.put(saved); const view = render(<MessageComposer scope={scope} conversationId={conversation.id} canSend confirmed={vi.fn()} />);
    await screen.findByAltText('Image preview'); expect((screen.getByRole('textbox', { name: 'Message' }) as HTMLInputElement).value).toBe('saved text'); view.unmount();
    expect(await mocks.repo.get(saved.key)).toMatchObject({ text: 'saved text', imageName: 'saved.png' }); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-private');
  });
  it('does not clear a new connection draft when the old send resolves late', async () => {
    const confirmed = vi.fn(); const pending = deferred<ReturnType<typeof receipt>>(); mocks.api.send.mockReturnValue(pending.promise);
    const view = render(<MessageComposer scope={scope} conversationId={conversation.id} canSend confirmed={confirmed} />);
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Message' }) as HTMLInputElement).disabled).toBe(false));
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'old draft' } }); fireEvent.click(screen.getByRole('button', { name: 'Send message' })); await waitFor(() => expect(mocks.api.send).toHaveBeenCalledOnce());
    const intent = mocks.api.send.mock.calls[0][1]; const next = { ...scope, relationshipSessionId: uuid(77) };
    view.rerender(<MessageComposer scope={next} conversationId={conversation.id} canSend confirmed={confirmed} />);
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Message' }) as HTMLInputElement).disabled).toBe(false));
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'new draft' } });
    await act(async () => { pending.resolve(receipt(intent.commandId)); await flush(); });
    expect((screen.getByRole('textbox', { name: 'Message' }) as HTMLInputElement).value).toBe('new draft');
  });
  it('retained conversations have no enabled send controls and earlier requests only permit receipt lookup', async () => {
    const prior = { ...emptyMessageDraft({ ...scope, relationshipSessionId: uuid(88) }, conversation.id), text: 'earlier draft', status: 'unknown' as const };
    await mocks.repo.put(prior);
    render(<><MessageComposer scope={scope} conversationId={conversation.id} canSend={false} confirmed={vi.fn()} /><EarlierMessageDrafts scope={scope} /></>);
    await screen.findByText('earlier draft'); expect((screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Check earlier delivery' })); await screen.findByText(/No confirmed receipt was found/); expect(mocks.api.send).not.toHaveBeenCalled();
    expect(mocks.api.receipt).toHaveBeenCalledWith(scope.accountId, prior.commandId);
  });
  it('shows archived labels only and revokes authenticated image URLs when the connection changes', async () => {
    const archived = { ...conversation, label: 'Former partner', state: 'archived' as const, canSend: false };
    const attached = message(10, { attachment: { id: uuid(80), mimeType: 'image/png', byteSize: 3 } });
    const view = render(<MessageItem message={attached} scope={scope} conversation={archived} onImageLoad={vi.fn()} />);
    await screen.findByAltText('Message image'); expect(screen.getByText('Former partner')).toBeTruthy(); expect(screen.getByAltText('Message image').getAttribute('src')).toBe('blob:synthetic-private');
    view.rerender(<MessageItem message={attached} scope={{ ...scope, relationshipSessionId: uuid(99) }} conversation={archived} onImageLoad={vi.fn()} />);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-private'); view.unmount();
  });
});
