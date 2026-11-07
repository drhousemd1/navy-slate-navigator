vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: 'default' }) }));
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://backend.invalid', supabase: { auth: { getSession: vi.fn() } } }));
const mocks = vi.hoisted(() => ({ identity: null as any, api: null as any, repo: null as any }));
vi.mock('@/contexts/UserIdsContext', () => ({ useUserIds: () => mocks.identity }));
vi.mock('@/data/messages/transport', async original => ({ ...await original<typeof import('@/data/messages/transport')>(), messageTransport: new Proxy({}, { get: (_target, name) => mocks.api[name] }) }));
vi.mock('@/data/messages/drafts', async original => ({ ...await original<typeof import('@/data/messages/drafts')>(), messageDraftRepository: () => mocks.repo }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }) => <main>{children}</main> }));
import Messages from '@/pages/Messages';
import { apiFixture, conversation, deferred, flush, message, page, repositoryFixture, scope, uuid } from './messages.helpers';

beforeEach(() => {
  mocks.identity = { canAccessData: true, isLoadingUserIds: false, currentUserId: scope.accountId, relationshipId: scope.relationshipId, relationshipSessionId: scope.relationshipSessionId };
  mocks.api = apiFixture(); mocks.repo = repositoryFixture().repo;
});
afterEach(cleanup);
describe('real messages page with scoped hooks', () => {
  it('uses explicit retained selection and server archive labels with no partner lookup or self fallback', async () => {
    const archived = { ...conversation, id: uuid(30), state: 'archived' as const, canSend: false, label: 'Former partner' };
    mocks.api.list.mockResolvedValue({ currentConversationId: null, conversations: [archived] });
    mocks.api.page.mockResolvedValue({ ...page([message(10, { content: 'Retained synthetic text' })]), conversation: archived });
    render(<Messages />);
    await screen.findByRole('combobox', { name: 'Conversation' }); expect(mocks.api.page).not.toHaveBeenCalled();
    expect(screen.getByText('Choose a retained conversation to read it.')).toBeTruthy(); fireEvent.change(screen.getByRole('combobox', { name: 'Conversation' }), { target: { value: archived.id } });
    await screen.findByText('Retained synthetic text'); expect(screen.getByText('This retained conversation is read-only.')).toBeTruthy();
    expect(screen.getByText('Names and avatars are hidden. Message text and images may still identify people.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled).toBe(true); expect(mocks.api.send).not.toHaveBeenCalled();
  });
  it('loads an authenticated current conversation automatically and exposes a failed refresh without losing rows', async () => {
    render(<Messages />); await screen.findByText('Synthetic 10');
    mocks.api.list.mockRejectedValue(new Error('Cannot refresh synthetic messages'));
    await act(async () => { window.dispatchEvent(new Event('focus')); await flush(); });
    await screen.findByText('Cannot refresh synthetic messages'); expect(screen.getByText('Synthetic 10')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('drops a late account-A response and never shows its conversation in account B', async () => {
    const pending = deferred<ReturnType<typeof page>>(); mocks.api.page.mockReturnValue(pending.promise);
    const view = render(<Messages />); await waitFor(() => expect(mocks.api.page).toHaveBeenCalled());
    mocks.identity = { ...mocks.identity, currentUserId: uuid(99), relationshipId: uuid(98), relationshipSessionId: uuid(97) };
    mocks.api.list.mockResolvedValue({ currentConversationId: null, conversations: [] }); view.rerender(<Messages />);
    await screen.findByText('Connect with your partner in Profile to start a conversation.');
    await act(async () => { pending.resolve(page([message(10, { content: 'Account A private text' })])); await flush(); });
    expect(screen.queryByText('Account A private text')).toBeNull();
  });
  it('does not request anything without a verified relationship generation', async () => {
    mocks.identity = { ...mocks.identity, relationshipSessionId: null }; render(<Messages />); await act(flush);
    expect(mocks.api.list).not.toHaveBeenCalled(); expect(mocks.api.page).not.toHaveBeenCalled(); expect(screen.getByText('Checking your account connection…')).toBeTruthy();
  });
});
