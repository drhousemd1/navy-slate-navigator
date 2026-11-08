vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: 'default' }) }));
import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { usePartnerLinking } from '@/contexts/auth/usePartnerLinking';
import { UserIdsProvider, useUserIds } from '@/contexts/UserIdsContext';
import { emptyIdentity, resolveIdentity, type IdentityState } from '@/lib/identity';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), command: vi.fn(), preview: vi.fn(), options: vi.fn(), prepare: vi.fn(), auth: {} as Record<string, unknown>, success: vi.fn(), error: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'http://127.0.0.1:28622' }));
vi.mock('@/data/identity', () => ({ fetchIdentity: mocks.fetch, callIdentityCommand: mocks.command, fetchLinkPreview: mocks.preview, fetchPartnerLinkOptions: mocks.options, identityCommandError: (error: Error) => error.message }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/data/indexedDB/useIndexedDB', () => ({ prepareIdentityCacheScope: mocks.prepare }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/toastManager', () => ({ toastManager: { success: mocks.success, error: mocks.error } }));

const user = (id: string) => ({ id }) as User;
const solo = (id: string, role: 'dom' | 'sub' = 'dom'): IdentityState => ({
  ...resolveIdentity(id, { id, role, linked_partner_id: null }), relationshipId: `period-${id}`, relationshipSessionId: '00000000-0000-4000-8000-000000000090', participantId: `member-${id}`, lifecycleReady: false,
});
const linked = (): IdentityState => ({
  ...resolveIdentity('A', { id: 'A', role: 'sub', linked_partner_id: 'D' }, { id: 'D', role: 'dom', linked_partner_id: 'A' }),
  relationshipId: 'old-period', relationshipSessionId: '00000000-0000-4000-8000-000000000090', partnerRole: 'dom', lifecycleReady: false,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
afterEach(cleanup);
beforeEach(() => { vi.resetAllMocks(); mocks.prepare.mockResolvedValue(undefined); });

describe('authoritative identity request lifecycle', () => {
  it('exposes a preview failure for inline display and clears it when the same account retries', async () => {
    mocks.fetch.mockResolvedValue(solo('A'));
    const failure = 'This invitation changed. Ask your partner for a new code.';
    mocks.preview.mockRejectedValueOnce(new Error(failure)).mockResolvedValueOnce({ mode: 'fresh', previousRelationshipId: null, canContinuePrevious: false });
    const { result } = renderHook(() => usePartnerLinking(user('A')));
    await waitFor(() => expect(result.current.relationshipIdentity.status).toBe('unlinked'));
    await act(async () => { expect(await result.current.previewPartnerCode('old-code')).toBeNull(); });
    expect(result.current.partnerLinkingError).toBe(failure);
    await act(async () => { expect(await result.current.previewPartnerCode('new-code')).toMatchObject({ mode: 'fresh' }); });
    expect(result.current.partnerLinkingError).toBeNull();
    expect(mocks.command).not.toHaveBeenCalled();
  });

  it('does not expose a delayed preview failure after the relationship session changes', async () => {
    let reject!: (reason: Error) => void;
    mocks.fetch.mockResolvedValue(solo('A'));
    mocks.preview.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
    const { result } = renderHook(() => usePartnerLinking(user('A')));
    await waitFor(() => expect(result.current.relationshipIdentity.status).toBe('unlinked'));
    let preview!: Promise<unknown>;
    act(() => { preview = result.current.previewPartnerCode('old-code'); });
    mocks.fetch.mockResolvedValue({ ...solo('A'), relationshipSessionId: '00000000-0000-4000-8000-000000000091' });
    await act(async () => { await result.current.refreshIdentity(); });
    await act(async () => { reject(new Error('Old invitation failure')); await preview; });
    expect(result.current.partnerLinkingError).toBeNull();
    expect(mocks.error).not.toHaveBeenCalled();
  });

  const choices = (id = 'A', session = solo(id).relationshipSessionId) => ({ relationshipId: `period-${id}`, relationshipSessionId: session,
    canGenerateFresh: true, invitation: null, archivedRelationships: [{ relationshipId: 'previous', startedAt: '2025-01-01T00:00:00Z', endedAt: '2025-02-01T00:00:00Z', formerPartnerLabel: 'Former partner', canGenerateContinue: true }] });

  it('loads scoped choices on demand and drops delayed responses after an account switch', async () => {
    const pending = deferred<ReturnType<typeof choices>>();
    mocks.fetch.mockImplementation((id: string) => Promise.resolve(solo(id))); mocks.options.mockReturnValue(pending.promise);
    const { result, rerender } = renderHook(({ account }) => usePartnerLinking(account), { initialProps: { account: user('A') } });
    await waitFor(() => expect(result.current.relationshipIdentity.status).toBe('unlinked'));
    expect(mocks.options).not.toHaveBeenCalled();
    let loading!: Promise<unknown>; act(() => { loading = result.current.reloadPartnerLinkOptions(); });
    expect(mocks.options).toHaveBeenCalledWith('A', 'period-A', solo('A').relationshipSessionId, expect.any(AbortSignal));
    rerender({ account: user('B') }); await waitFor(() => expect(result.current.relationshipIdentity.currentUserId).toBe('B'));
    await act(async () => { pending.resolve(choices()); await loading; });
    expect(result.current.partnerLinkOptions).toBeNull(); expect(result.current.getCurrentLinkCode()).toBeNull();
  });

  it('rejects delayed options from an earlier connection generation without replacing the verified identity', async () => {
    const pending = deferred<ReturnType<typeof choices>>();
    mocks.fetch.mockResolvedValue(solo('A')); mocks.options.mockReturnValue(pending.promise);
    const { result } = renderHook(() => usePartnerLinking(user('A')));
    await waitFor(() => expect(result.current.relationshipIdentity.status).toBe('unlinked'));
    let loading!: Promise<unknown>; act(() => { loading = result.current.reloadPartnerLinkOptions(); });
    const newer = { ...solo('A'), relationshipSessionId: '00000000-0000-4000-8000-000000000091' }; mocks.fetch.mockResolvedValue(newer);
    await act(async () => { await result.current.refreshIdentity(); });
    await act(async () => { pending.resolve(choices()); expect(await loading).toBeNull(); });
    expect(result.current.partnerLinkOptions).toBeNull();
    expect(result.current.relationshipIdentity.relationshipSessionId).toBe(newer.relationshipSessionId);
  });

  it('generates exact Continue consent and exposes only the read-back invitation metadata', async () => {
    const code = 'A'.repeat(32);
    mocks.fetch.mockResolvedValue(solo('A')); mocks.options.mockResolvedValueOnce(choices()).mockResolvedValueOnce({ ...choices(), invitation: { code, mode: 'continue', previousRelationshipId: 'previous' } });
    mocks.command.mockResolvedValue({ code, mode: 'continue', previous_relationship_id: 'previous' });
    const { result } = renderHook(() => usePartnerLinking(user('A')));
    await waitFor(() => expect(result.current.relationshipIdentity.status).toBe('unlinked'));
    await act(async () => { await result.current.reloadPartnerLinkOptions(); });
    await act(async () => { expect(await result.current.generateLinkCode('continue', 'previous')).toBe(code); });
    expect(mocks.command).toHaveBeenCalledExactlyOnceWith('A', 'generate_partner_link_code', { p_expected_relationship_id: 'period-A', p_expected_relationship_session_id: solo('A').relationshipSessionId, p_mode: 'continue', p_previous_relationship_id: 'previous' });
    expect(result.current.partnerLinkOptions?.invitation?.mode).toBe('continue'); expect(result.current.getCurrentLinkCode()).toBe(code);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it('hides an uncertain replacement and restores only authoritative metadata after a manual reload', async () => {
    const initial = { ...choices(), invitation: { code: 'A'.repeat(32), mode: 'fresh', previousRelationshipId: null } };
    const replacement = { ...choices(), invitation: { code: 'B'.repeat(32), mode: 'continue', previousRelationshipId: 'previous' } };
    mocks.fetch.mockResolvedValue(solo('A')); mocks.options.mockResolvedValueOnce(initial).mockResolvedValueOnce(replacement);
    mocks.command.mockRejectedValue(new Error('Response unavailable'));
    const { result } = renderHook(() => usePartnerLinking(user('A')));
    await waitFor(() => expect(result.current.relationshipIdentity.status).toBe('unlinked'));
    await act(async () => { await result.current.reloadPartnerLinkOptions(); });
    await act(async () => { expect(await result.current.generateLinkCode('continue', 'previous')).toBeNull(); });
    expect(result.current.getCurrentLinkCode()).toBeNull(); expect(result.current.partnerLinkOptionsError).toBe('Response unavailable');
    expect(result.current.relationshipIdentity.status).toBe('unlinked');
    await act(async () => { await result.current.reloadPartnerLinkOptions(); });
    expect(result.current.getCurrentLinkCode()).toBe('B'.repeat(32)); expect(mocks.command).toHaveBeenCalledTimes(1);
  });

  it('does not claim generation success when the read-back fails or the connection changes during creation', async () => {
    mocks.fetch.mockResolvedValue(solo('A')); mocks.options.mockResolvedValueOnce(choices()).mockRejectedValueOnce(new Error('Read unavailable'));
    mocks.command.mockResolvedValue({ code: 'A'.repeat(32) });
    const { result } = renderHook(() => usePartnerLinking(user('A')));
    await waitFor(() => expect(result.current.relationshipIdentity.status).toBe('unlinked'));
    await act(async () => { await result.current.reloadPartnerLinkOptions(); });
    await act(async () => { expect(await result.current.generateLinkCode('fresh', null)).toBeNull(); });
    expect(result.current.getCurrentLinkCode()).toBeNull(); expect(result.current.partnerLinkOptionsError).toBe('Read unavailable');
    mocks.options.mockResolvedValue(choices()); await act(async () => { await result.current.reloadPartnerLinkOptions(); });
    const pending = deferred<unknown>(); mocks.command.mockReturnValue(pending.promise);
    let generation!: Promise<string | null>; act(() => { generation = result.current.generateLinkCode('fresh', null); });
    mocks.fetch.mockResolvedValue({ ...solo('A'), relationshipSessionId: '00000000-0000-4000-8000-000000000091' });
    await act(async () => { await result.current.refreshIdentity(); });
    await act(async () => { pending.resolve({ code: 'B'.repeat(32) }); expect(await generation).toBeNull(); });
    expect(result.current.getCurrentLinkCode()).toBeNull(); expect(result.current.partnerLinkOptions).toBeNull();
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it('releases a never-settling generation after its deadline, recovers by read only, and ignores a late response', async () => {
    const pending = deferred<unknown>();
    const before = { ...choices(), invitation: { code: 'A'.repeat(32), mode: 'fresh', previousRelationshipId: null } };
    const recovered = { ...choices(), invitation: { code: 'B'.repeat(32), mode: 'continue', previousRelationshipId: 'previous' } };
    mocks.fetch.mockResolvedValue(solo('A')); mocks.options.mockResolvedValueOnce(before).mockResolvedValueOnce(recovered);
    mocks.command.mockReturnValue(pending.promise);
    const { result } = renderHook(() => usePartnerLinking(user('A')));
    await waitFor(() => expect(result.current.relationshipIdentity.status).toBe('unlinked'));
    await act(async () => { await result.current.reloadPartnerLinkOptions(); });
    vi.useFakeTimers();
    try {
      let saving!: Promise<string | null>;
      act(() => { saving = result.current.generateLinkCode('continue', 'previous'); });
      expect(result.current.loading).toBe(true); expect(result.current.getCurrentLinkCode()).toBeNull();
      await act(async () => { await vi.advanceTimersByTimeAsync(12_000); expect(await saving).toBeNull(); });
      expect(result.current.loading).toBe(false); expect(result.current.partnerLinkOptionsLoading).toBe(false);
      expect(result.current.partnerLinkOptionsError).toContain('Could not confirm invitation generation. Reload invitation choices before sharing a code.');
      expect(result.current.getCurrentLinkCode()).toBeNull();
      await act(async () => { await result.current.reloadPartnerLinkOptions(); });
      expect(result.current.getCurrentLinkCode()).toBe('B'.repeat(32)); expect(result.current.partnerLinkOptionsError).toBeNull();
      await act(async () => pending.resolve({ code: 'C'.repeat(32) }));
      expect(result.current.getCurrentLinkCode()).toBe('B'.repeat(32));
      expect(mocks.command).toHaveBeenCalledTimes(1); expect(mocks.options).toHaveBeenCalledTimes(2);
      expect(mocks.success).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });

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
    expect(mocks.command).toHaveBeenCalledExactlyOnceWith('A', 'unlink_my_partner', { p_expected_relationship_id: 'old-period', p_expected_relationship_session_id: '00000000-0000-4000-8000-000000000090' });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.success).not.toHaveBeenCalled();
    expect(result.current.partnerLinkingError).toBe('PERIOD_CHANGED');
  });

  it('accepts the exact reviewed continuation mode and period, and does not report success if refresh fails', async () => {
    mocks.fetch.mockResolvedValueOnce(solo('A')).mockRejectedValueOnce(new Error('offline'));
    mocks.command.mockResolvedValue({});
    const { result } = renderHook(() => usePartnerLinking(user('A')));
    await waitFor(() => expect(result.current.relationshipIdentity.status).toBe('unlinked'));
    await act(async () => { expect(await result.current.linkToPartner(' code ', { mode: 'continue', previousRelationshipId: 'archived-period', canContinuePrevious: true })).toBe(false); });
    expect(mocks.command).toHaveBeenCalledWith('A', 'accept_partner_link_code', { p_expected_relationship_id: 'period-A', p_expected_relationship_session_id: '00000000-0000-4000-8000-000000000090', p_code: 'CODE', p_mode: 'continue', p_previous_relationship_id: 'archived-period' });
    expect(mocks.success).not.toHaveBeenCalled();
    expect(result.current.relationshipIdentity.status).toBe('error');
  });  it('retains the refreshed generation and rejects late command success plus stale callbacks from the same pair', async () => {
    const pending = deferred<unknown>();
    mocks.fetch.mockResolvedValue(solo('A')); mocks.command.mockReturnValue(pending.promise);
    const { result } = renderHook(() => usePartnerLinking(user('A')));
    await waitFor(() => expect(result.current.relationshipIdentity.status).toBe('unlinked'));
    const oldUpdate = result.current.updateRelationshipPermissions;
    let saving!: Promise<boolean>;
    act(() => { saving = oldUpdate({ task_complete: 'both' }); });
    const continued = { ...solo('A'), relationshipSessionId: '00000000-0000-4000-8000-000000000091' };
    mocks.fetch.mockResolvedValue(continued);
    await act(async () => { await result.current.refreshIdentity(); });
    await act(async () => { pending.resolve({}); expect(await saving).toBe(false); });
    await act(async () => { expect(await oldUpdate({ task_complete: 'dom' })).toBe(false); });
    expect(mocks.command).toHaveBeenCalledTimes(1);
    expect(mocks.command.mock.calls[0][2].p_expected_relationship_session_id).toBe(solo('A').relationshipSessionId);
    expect(result.current.relationshipIdentity.relationshipSessionId).toBe(continued.relationshipSessionId);
    expect(mocks.success).not.toHaveBeenCalled(); expect(result.current.loading).toBe(false);
  });
  it('sends the malformed owned-context generation for unlink repair but refuses missing-session commands', async () => {
    const invalid = { ...linked(), status: 'invalid' as const, canAccessData: false, subUserId: null, domUserId: null, lifecycleReady: true };
    mocks.fetch.mockResolvedValue(invalid); mocks.command.mockRejectedValue(new Error('STALE_RELATIONSHIP_SESSION'));
    const { result } = renderHook(() => usePartnerLinking(user('A')));
    await waitFor(() => expect(result.current.relationshipIdentity.status).toBe('invalid'));
    await act(async () => { expect(await result.current.unlinkFromPartner()).toBe(false); });
    expect(mocks.command).toHaveBeenCalledExactlyOnceWith('A', 'unlink_my_partner', { p_expected_relationship_id: invalid.relationshipId, p_expected_relationship_session_id: invalid.relationshipSessionId });
    expect(result.current.relationshipIdentity).toEqual(invalid);
    mocks.fetch.mockResolvedValue({ ...solo('A'), relationshipSessionId: null });
    await act(async () => { await result.current.refreshIdentity(); });
    await act(async () => { expect(await result.current.generateLinkCode()).toBeNull(); expect(await result.current.updateRelationshipPermissions({ task_complete: 'both' })).toBe(false); });
    expect(mocks.command).toHaveBeenCalledTimes(1);
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

  it('prepares a new cache namespace for Continue without deleting durable mutations', async () => {
    auth(solo('A')); const view = renderBoundary(); await screen.findByTestId('domain');
    view.client.setQueryData(['old-session'], { private: true });
    const mutation = view.client.getMutationCache().build(view.client, { mutationFn: async () => 'saved intent' });
    const previous = mocks.prepare.mock.calls.at(-1)?.[0];
    mocks.auth.relationshipIdentity = { ...solo('A'), relationshipSessionId: '00000000-0000-4000-8000-000000000091' }; view.repaint();
    await screen.findByTestId('domain');
    expect(mocks.prepare.mock.calls.at(-1)?.[0]).not.toBe(previous);
    expect(view.client.getQueryData(['old-session'])).toBeUndefined();
    expect(view.client.getMutationCache().getAll()).toContain(mutation); expect(view.clear).not.toHaveBeenCalled();
  });

  it('removes unowned in-memory reads on account change without clearing pending mutations', async () => {
    auth(solo('A')); const view = renderBoundary(); await screen.findByTestId('domain');
    view.client.setQueryData(['old-ownerless-content'], { private: 'A' });
    const mutation = view.client.getMutationCache().build(view.client, { mutationFn: async () => 'saved intent' });
    auth(solo('B')); view.repaint(); await screen.findByTestId('domain');
    expect(screen.getByTestId('domain').textContent).toContain('B');
    expect(view.client.getQueryData(['old-ownerless-content'])).toBeUndefined();
    expect(view.client.getMutationCache().getAll()).toContain(mutation); expect(view.clear).not.toHaveBeenCalled();
    expect(mocks.prepare.mock.calls.at(-1)?.[0]).toEqual({ backendId: 'http://127.0.0.1:28622', accountId: 'B', relationshipId: 'period-B', relationshipSessionId: solo('B').relationshipSessionId });
  });

  it('releases a pending repair when an invalid owned context changes generation without becoming valid', async () => {
    let reject!: (error: Error) => void;
    const invalid = { ...emptyIdentity('invalid', 'A', 'Partner invalid'), problem: 'same_role', partnerUserId: 'D', lifecycleReady: true,
      relationshipId: 'period', relationshipSessionId: '00000000-0000-4000-8000-000000000090' };
    auth(invalid); mocks.auth.unlinkFromPartner = vi.fn(() => new Promise((_yes, no) => { reject = no; }));
    const view = renderBoundary(); fireEvent.click(screen.getByRole('button', { name: 'Disconnect partner' }));
    expect((screen.getByRole('button', { name: 'Disconnect partner' }) as HTMLButtonElement).disabled).toBe(true);
    mocks.auth.relationshipIdentity = { ...invalid, relationshipSessionId: '00000000-0000-4000-8000-000000000091' }; view.repaint();
    await waitFor(() => expect((screen.getByRole('button', { name: 'Disconnect partner' }) as HTMLButtonElement).disabled).toBe(false));
    await act(async () => reject(new Error('Old repair failed')));
    expect(screen.queryByText('Old repair failed')).toBeNull();
    expect((screen.getByRole('button', { name: 'Disconnect partner' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows a visible staged limitation for invalid partner repair, with retry still available', async () => {
    auth({ ...emptyIdentity('invalid', 'A', 'Partner invalid'), problem: 'same_role', partnerUserId: 'D', lifecycleReady: false });
    renderBoundary();
    expect((screen.getByRole('button', { name: 'Disconnect partner' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Partner changes are temporarily unavailable. Retry loading your account, or use password recovery.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Retry' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
