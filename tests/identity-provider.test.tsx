import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { usePartnerLinking } from '@/contexts/auth/usePartnerLinking';
import { UserIdsProvider, useUserIds } from '@/contexts/UserIdsContext';
import { emptyIdentity, resolveIdentity, type IdentityState } from '@/lib/identity';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), command: vi.fn(), preview: vi.fn(), prepare: vi.fn(), auth: {} as Record<string, unknown>, success: vi.fn(), error: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'http://127.0.0.1:28622' }));
vi.mock('@/data/identity', () => ({ fetchIdentity: mocks.fetch, callIdentityCommand: mocks.command, fetchLinkPreview: mocks.preview, identityCommandError: (error: Error) => error.message }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/data/indexedDB/useIndexedDB', () => ({ prepareIdentityCacheScope: mocks.prepare }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/toastManager', () => ({ toastManager: { success: mocks.success, error: mocks.error } }));

const user = (id: string) => ({ id }) as User;
const solo = (id: string, role: 'dom' | 'sub' = 'dom'): IdentityState => ({
  ...resolveIdentity(id, { id, role, linked_partner_id: null }), relationshipId: `period-${id}`, participantId: `member-${id}`, lifecycleReady: false,
});
const linked = (): IdentityState => ({
  ...resolveIdentity('A', { id: 'A', role: 'sub', linked_partner_id: 'D' }, { id: 'D', role: 'dom', linked_partner_id: 'A' }),
  relationshipId: 'old-period', partnerRole: 'dom', lifecycleReady: false,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
afterEach(cleanup);
beforeEach(() => { vi.resetAllMocks(); mocks.prepare.mockResolvedValue(undefined); });

describe('authoritative identity request lifecycle', () => {
  it('discards a delayed A response after switching to B, including old metadata-facing getters', async () => {
    const pendingA = deferred<IdentityState>();
    mocks.fetch.mockImplementation((id: string) => id === 'A' ? pendingA.promise : Promise.resolve(solo('B')));
    const { result, rerender } = renderHook(({ account }) => usePartnerLinking(account), { initialProps: { account: user('A') } });
    const oldGetter = result.current.getLinkedPartnerId;
    rerender({ account: user('B') });
    expect(result.current.relationshipIdentity.currentUserId).toBe('B');
    expect(result.current.getLinkedPartnerId()).toBeNull();
    expect(oldGetter()).toBeNull();
    await waitFor(() => expect(result.current.relationshipIdentity.status).toBe('unlinked'));
    await act(async () => pendingA.resolve(linked()));
    expect(result.current.relationshipIdentity).toMatchObject({ currentUserId: 'B', domUserId: 'B', subUserId: null });
  });

  it('distinguishes failed loading from solo and exposes a successful retry', async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(solo('A', 'sub'));
    const { result } = renderHook(() => usePartnerLinking(user('A')));
    await waitFor(() => expect(result.current.relationshipIdentity.status).toBe('error'));
    expect(result.current.relationshipIdentity.subUserId).toBeNull();
    await act(async () => { await result.current.refreshIdentity(); });
    expect(result.current.relationshipIdentity).toMatchObject({ status: 'unlinked', subUserId: 'A', domUserId: null });
  });

  it('rejects an older same-account refresh and a stale command callback after sign-out', async () => {
    const old = deferred<IdentityState>();
    mocks.fetch.mockReturnValueOnce(old.promise).mockResolvedValueOnce(solo('A'));
    const { result, rerender } = renderHook(({ account }: { account: User | null }) => usePartnerLinking(account), { initialProps: { account: user('A') as User | null } });
    await act(async () => { await result.current.refreshIdentity(); });
    const oldGenerate = result.current.generateLinkCode;
    await act(async () => old.resolve(linked()));
    expect(result.current.relationshipIdentity.status).toBe('unlinked');
    rerender({ account: null });
    await act(async () => { await oldGenerate(); });
    expect(mocks.command).not.toHaveBeenCalled();
    expect(result.current.relationshipIdentity.status).toBe('signed-out');
  });

  it('sends the reviewed period for unlink, never a newly looked-up replacement after a conflict', async () => {
    mocks.fetch.mockResolvedValue(linked());
    mocks.command.mockRejectedValue(new Error('PERIOD_CHANGED'));
    const { result } = renderHook(() => usePartnerLinking(user('A')));
    await waitFor(() => expect(result.current.relationshipIdentity.status).toBe('linked'));
    await act(async () => { expect(await result.current.unlinkFromPartner()).toBe(false); });
    expect(mocks.command).toHaveBeenCalledExactlyOnceWith('A', 'unlink_my_partner', { p_expected_relationship_id: 'old-period' });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it('accepts the exact reviewed continuation mode and period, and does not report success if refresh fails', async () => {
    mocks.fetch.mockResolvedValueOnce(solo('A')).mockRejectedValueOnce(new Error('offline'));
    mocks.command.mockResolvedValue({});
    const { result } = renderHook(() => usePartnerLinking(user('A')));
    await waitFor(() => expect(result.current.relationshipIdentity.status).toBe('unlinked'));
    await act(async () => { expect(await result.current.linkToPartner(' code ', { mode: 'continue', previousRelationshipId: 'archived-period', canContinuePrevious: true })).toBe(false); });
    expect(mocks.command).toHaveBeenCalledWith('A', 'accept_partner_link_code', { p_expected_relationship_id: 'period-A', p_code: 'CODE', p_mode: 'continue', p_previous_relationship_id: 'archived-period' });
    expect(mocks.success).not.toHaveBeenCalled();
    expect(result.current.relationshipIdentity.status).toBe('error');
  });
});

function Consumer() {
  const ids = useUserIds();
  return <div data-testid="domain">{JSON.stringify({ sub: ids.subUserId, dom: ids.domUserId, status: ids.status })}</div>;
}
function renderBoundary(path = '/tasks') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const clear = vi.spyOn(client, 'clear');
  const result = render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><UserIdsProvider><Consumer /></UserIdsProvider></MemoryRouter></QueryClientProvider>);
  return { ...result, client, clear, repaint: () => result.rerender(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><UserIdsProvider><Consumer /></UserIdsProvider></MemoryRouter></QueryClientProvider>) };
}
function auth(identity: IdentityState) {
  mocks.auth = { user: user(identity.currentUserId ?? 'A'), loading: false, relationshipIdentity: identity,
    refreshIdentity: vi.fn().mockResolvedValue(identity), signOut: vi.fn(), updateUserRole: vi.fn(), unlinkFromPartner: vi.fn() };
}

describe('real UserIds boundary', () => {
  it('keeps solo Dom own-data access without inventing a Sub', async () => {
    auth(solo('A'));
    renderBoundary();
    await screen.findByTestId('domain');
    expect(screen.getByTestId('domain').textContent).toBe('{"sub":null,"dom":"A","status":"unlinked"}');
  });

  it('blocks invalid and failed identity, provides retry, and provides role setup only for the own missing role', async () => {
    auth({ ...emptyIdentity('invalid', 'A', 'Choose your role'), problem: 'missing_profile' });
    renderBoundary();
    expect(screen.queryByTestId('domain')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Choose Dom' }));
    await waitFor(() => expect(mocks.auth.updateUserRole).toHaveBeenCalledWith('dom'));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(mocks.auth.refreshIdentity).toHaveBeenCalled());
  });

  it.each(['/auth', '/forgot-password', '/reset-password'])('preserves public account route %s even with invalid profile', async path => {
    auth({ ...emptyIdentity('invalid', 'A', 'Cannot load partner'), problem: 'same_role', partnerUserId: 'D' });
    renderBoundary(path);
    expect(screen.getByTestId('domain')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Account connection needs attention' })).toBeNull();
  });

  it('never clears mutations during an ordinary same-account identity refresh', async () => {
    auth(solo('A'));
    const view = renderBoundary();
    await screen.findByTestId('domain');
    const mutation = view.client.getMutationCache().build(view.client, { mutationFn: async () => 'pending' });
    mocks.auth.relationshipIdentity = emptyIdentity('loading', 'A');
    view.repaint();
    expect(screen.queryByTestId('domain')).toBeNull();
    mocks.auth.relationshipIdentity = solo('A');
    view.repaint();
    await screen.findByTestId('domain');
    expect(view.clear).not.toHaveBeenCalled();
    expect(view.client.getMutationCache().getAll()).toContain(mutation);
  });

  it('shows a visible staged limitation for invalid partner repair, with retry still available', async () => {
    auth({ ...emptyIdentity('invalid', 'A', 'Partner invalid'), problem: 'same_role', partnerUserId: 'D', lifecycleReady: false });
    renderBoundary();
    expect((screen.getByRole('button', { name: 'Disconnect partner' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Partner changes are temporarily unavailable until/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Retry' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
