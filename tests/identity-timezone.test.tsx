vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: 'default' }) }));
import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { usePartnerLinking } from '@/contexts/auth/usePartnerLinking';
import TimezoneSection from '@/components/profile/TimezoneSection';
import { decodeIdentity, isValidTimezone, type IdentityState } from '@/lib/identity';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), command: vi.fn(), auth: {} as Record<string, unknown>, browserZone: 'America/Boise', toastSuccess: vi.fn(), toastError: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'http://127.0.0.1:28622' }));
vi.mock('@/data/identity', () => ({ fetchIdentity: mocks.fetch, callIdentityCommand: mocks.command, fetchLinkPreview: vi.fn(), identityCommandError: (error: Error) => error.message }));
vi.mock('@/lib/identity', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/identity')>(), getBrowserTimezone: () => mocks.browserZone }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/toastManager', () => ({ toastManager: { success: mocks.toastSuccess, error: mocks.toastError } }));
// These timezone fixtures deliberately use readable non-UUID account IDs; the
// recovery namespace has its own strict UUID transport tests.
vi.mock('@/lib/offline/recovery', async original => ({ ...await original<typeof import('@/lib/offline/recovery')>(), verifyRecoveryScope: vi.fn() }));
const user = (id: string) => ({ id }) as User;
const receipt = (id: string, timezone: string | null) => ({
  status: 'ready_solo', user_id: id, role: 'dom', linked_partner_id: null, partner_role: null, sub_user_id: null, dom_user_id: id,
  relationship_id: `period-${id}`, relationship_status: 'active', relationship_session_id: '00000000-0000-4000-8000-000000000090', participant_id: `member-${id}`,
  permissions: {}, lifecycle_ready: false, timezone, partner_link_code: null,
});
const identity = (id: string, timezone: string | null) => decodeIdentity(id, receipt(id, timezone));
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
afterEach(cleanup);
beforeEach(() => { vi.resetAllMocks(); mocks.browserZone = 'America/Boise'; });

describe('one-time browser timezone initialization', () => {
  it('initializes NULL through the compare/set RPC and respects a different saved value returned by a concurrent session', async () => {
    mocks.fetch.mockResolvedValue(identity('A', null));
    mocks.command.mockResolvedValue(receipt('A', 'Europe/London'));
    const { result } = renderHook(() => usePartnerLinking(user('A')));
    await waitFor(() => expect(result.current.relationshipIdentity.timezone).toBe('Europe/London'));
    expect(mocks.command).toHaveBeenCalledExactlyOnceWith('A', 'initialize_my_timezone', { p_timezone: 'America/Boise' });
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });
  it('never overwrites the saved zone when the browser moves, or when identity is refreshed', async () => {
    mocks.fetch.mockResolvedValue(identity('A', 'America/Boise'));
    mocks.browserZone = 'Asia/Tokyo';
    const { result } = renderHook(() => usePartnerLinking(user('A')));
    await waitFor(() => expect(result.current.relationshipIdentity.status).toBe('unlinked'));
    await act(async () => { await result.current.refreshIdentity(); });
    expect(result.current.relationshipIdentity.timezone).toBe('America/Boise');
    expect(mocks.command).not.toHaveBeenCalled();
  });
  it('discards delayed initialization after A switches to B, without applying A timezone or success feedback to B', async () => {
    const pending = deferred<unknown>();
    mocks.fetch.mockImplementation((id: string) => Promise.resolve(identity(id, id === 'A' ? null : 'Asia/Tokyo')));
    mocks.command.mockReturnValue(pending.promise);
    const { result, rerender } = renderHook(({ account }) => usePartnerLinking(account), { initialProps: { account: user('A') } });
    await waitFor(() => expect(mocks.command).toHaveBeenCalled());
    rerender({ account: user('B') });
    await waitFor(() => expect(result.current.relationshipIdentity.timezone).toBe('Asia/Tokyo'));
    await act(async () => pending.resolve(receipt('A', 'America/Boise')));
    expect(result.current.relationshipIdentity).toMatchObject({ currentUserId: 'B', timezone: 'Asia/Tokyo' });
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });
  it('keeps a failed initializer visible and retryable without inventing a timezone or blocking account data', async () => {
    mocks.fetch.mockResolvedValue(identity('A', null));
    mocks.command.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(receipt('A', 'America/Boise'));
    const { result } = renderHook(() => usePartnerLinking(user('A')));
    await waitFor(() => expect(result.current.relationshipIdentity.timezoneInitializationError).toMatch(/could not be saved/));
    expect(result.current.relationshipIdentity).toMatchObject({ canAccessData: true, timezone: null });
    await act(async () => { await result.current.refreshIdentity(); });
    expect(result.current.relationshipIdentity.timezone).toBe('America/Boise');
    expect(result.current.relationshipIdentity.timezoneInitializationError).toBeUndefined();
  });
  it('guards an explicit saved-zone update result and stale callback across accounts', async () => {
    const pending = deferred<unknown>();
    mocks.fetch.mockImplementation((id: string) => Promise.resolve(identity(id, 'UTC')));
    mocks.command.mockReturnValue(pending.promise);
    const { result, rerender } = renderHook(({ account }) => usePartnerLinking(account), { initialProps: { account: user('A') } });
    await waitFor(() => expect(result.current.relationshipIdentity.timezone).toBe('UTC'));
    const oldSave = result.current.updateTimezone;
    let saving!: Promise<boolean>;
    act(() => { saving = oldSave('Europe/London'); });
    rerender({ account: user('B') });
    await waitFor(() => expect(result.current.relationshipIdentity.currentUserId).toBe('B'));
    await act(async () => { pending.resolve(receipt('A', 'Europe/London')); expect(await saving).toBe(false); });
    await act(async () => { expect(await oldSave('Asia/Tokyo')).toBe(false); });
    expect(mocks.command).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(result.current.relationshipIdentity).toMatchObject({ currentUserId: 'B', timezone: 'UTC' });
  });
});

function auth(state: IdentityState) {
  mocks.auth = { relationshipIdentity: state, updateTimezone: vi.fn().mockResolvedValue(true), refreshIdentity: vi.fn() };
}
describe('saved timezone profile control', () => {
  it('shows the saved preference rather than the traveling browser zone, explains deadlines, and saves only explicitly', async () => {
    mocks.browserZone = 'Asia/Tokyo'; auth(identity('A', 'America/Boise'));
    render(<TimezoneSection />);
    const input = screen.getByLabelText('Timezone') as HTMLInputElement;
    expect(input.value).toBe('America/Boise');
    expect(screen.getByText('Task deadlines use this timezone, even when you travel.')).toBeTruthy();
    expect(screen.queryByText(/Saved timezone:/)).toBeNull();
    fireEvent.change(input, { target: { value: 'Europe/London' } });
    expect(mocks.auth.updateTimezone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save Timezone' }));
    await waitFor(() => expect(mocks.auth.updateTimezone).toHaveBeenCalledWith('Europe/London'));
  });
  it('rejects invalid input locally and leaves the saved preference intact after failed saving', async () => {
    auth(identity('A', 'UTC'));
    vi.mocked(mocks.auth.updateTimezone as () => Promise<boolean>).mockResolvedValue(false);
    render(<TimezoneSection />);
    fireEvent.change(screen.getByLabelText('Timezone'), { target: { value: 'Not/A_Timezone' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Timezone' }));
    expect(screen.getByRole('alert').textContent).toMatch(/Choose a valid timezone/);
    expect(mocks.auth.updateTimezone).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Timezone'), { target: { value: 'Europe/London' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Timezone' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/not confirmed/));
    expect(screen.getByText('UTC', { selector: 'span' })).toBeTruthy();
  });
  it('does not carry a draft or a late error into another account', async () => {
    auth(identity('A', 'UTC'));
    const pending = deferred<boolean>();
    vi.mocked(mocks.auth.updateTimezone as () => Promise<boolean>).mockReturnValue(pending.promise);
    const view = render(<TimezoneSection />);
    fireEvent.change(screen.getByLabelText('Timezone'), { target: { value: 'Europe/London' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Timezone' }));
    auth(identity('B', 'Asia/Tokyo')); view.rerender(<TimezoneSection />);
    await act(async () => pending.resolve(false));
    expect((screen.getByLabelText('Timezone') as HTMLInputElement).value).toBe('Asia/Tokyo');
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('supports valid IANA zones and UTC without accepting offsets or invented zones', () => {
    expect(isValidTimezone('America/Boise')).toBe(true);
    expect(isValidTimezone('Europe/London')).toBe(true);
    expect(isValidTimezone('UTC')).toBe(true);
    expect(isValidTimezone('')).toBe(false);
    expect(isValidTimezone('+03:00')).toBe(false);
    expect(isValidTimezone('Not/A_Timezone')).toBe(false);
  });
});
