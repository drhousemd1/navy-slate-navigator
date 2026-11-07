import React from 'react';
import type { Session } from '@supabase/supabase-js';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import { updateRecoveryPassword } from '@/pages/auth/recoveryPassword';
import { signOutOwnedSession } from '@/lib/ownedSignOut';
import { deferred } from './action-queue.helpers';
const backend = 'https://recovery.example.invalid';
const storageKey = 'sb-recovery-auth-token';
const mocks = vi.hoisted(() => ({ session: null as Session | null, update: vi.fn(), rawSignOut: vi.fn(),
  ownedSignOut: vi.fn(), revoke: vi.fn(), notify: vi.fn(), navigate: vi.fn(), toast: vi.fn(), fetch: vi.fn(),
  getSession: vi.fn(), setSession: vi.fn(), exchange: vi.fn(), verify: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://recovery.example.invalid',
  supabasePublicKey: 'public-fixture-key', supabaseAuthStorageKey: 'sb-recovery-auth-token',
  signOutCurrentSession: mocks.ownedSignOut,
  supabase: { auth: { getSession: mocks.getSession, setSession: mocks.setSession, exchangeCodeForSession: mocks.exchange,
    verifyOtp: mocks.verify, updateUser: mocks.update, signOut: mocks.rawSignOut } } }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), debug: vi.fn() } }));
function session(accountId: string, sessionId: string): Session {
  return { access_token: `fixture.${btoa(JSON.stringify({ sub: accountId, session_id: sessionId }))}.fixture`,
    refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600, user: { id: accountId } } as Session;
}
const original = session('account-a', 'session-a');
const replacement = session('account-b', 'session-b');
const recoveryUrls = [
  ['/reset-password#access_token=fixture-access&refresh_token=fixture-refresh', 'implicit'],
  ['/reset-password?code=fixture-code', 'code'],
  ['/reset-password?token_hash=fixture-hash&type=recovery', 'hash'],
  ['/reset-password?token=fixture-otp&email=fixture%40example.invalid', 'otp'],
];
function adopt(value: Session | null) {
  mocks.session = value;
  if (value) localStorage.setItem(storageKey, JSON.stringify(value)); else localStorage.removeItem(storageKey);
}
async function fillAndSubmit() {
  await screen.findByPlaceholderText('Enter your new password');
  fireEvent.change(screen.getByPlaceholderText('Enter your new password'), { target: { value: 'new-fixture-password' } });
  fireEvent.change(screen.getByPlaceholderText('Confirm your new password'), { target: { value: 'new-fixture-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));
}
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear(); adopt(original); window.history.replaceState({}, '', '/reset-password');
  mocks.getSession.mockImplementation(async () => ({ data: { session: mocks.session }, error: null }));
  mocks.setSession.mockResolvedValue({ data: { session: original }, error: null });
  mocks.exchange.mockResolvedValue({ data: { session: original }, error: null }); mocks.verify.mockResolvedValue({ data: { session: original }, error: null });
  mocks.update.mockResolvedValue({ data: { user: original.user }, error: null });
  mocks.rawSignOut.mockImplementation(async () => { adopt(null); return { error: null }; });
  mocks.revoke.mockResolvedValue({ error: null });
  mocks.ownedSignOut.mockImplementation((captured: Session) => signOutOwnedSession(captured, {
    backendId: backend, storageKey, storage: localStorage, revoke: mocks.revoke, notify: mocks.notify,
  }));
  mocks.fetch.mockResolvedValue(new Response(JSON.stringify(original.user), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', mocks.fetch);
});
afterEach(() => { cleanup(); localStorage.clear(); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('actual password recovery page ownership', () => {
  it.each(recoveryUrls)('does not adopt B when the final session read follows an explicitly established A recovery link (%s)', async url => {
    window.history.replaceState({}, '', url);
    const read = deferred<{ data: { session: Session }; error: null }>();
    mocks.getSession.mockReturnValueOnce(read.promise);
    render(<ResetPasswordPage />);
    await waitFor(() => expect(mocks.getSession).toHaveBeenCalledTimes(1));
    adopt(replacement);
    await act(async () => { read.resolve({ data: { session: replacement }, error: null }); });
    expect(screen.queryByPlaceholderText('Enter your new password')).toBeNull();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(replacement));
  });

  it('does not fall back to an existing session when an explicit link returns no session', async () => {
    window.history.replaceState({}, '', '/reset-password?code=fixture-code');
    mocks.exchange.mockResolvedValueOnce({ data: { session: null }, error: null });
    render(<ResetPasswordPage />);
    await screen.findByText('Your reset link is invalid or has expired. Please request a new one.');
    expect(screen.queryByPlaceholderText('Enter your new password')).toBeNull();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('does not globally sign out or navigate away from B after A’s awaited password update completes', async () => {
    const update = deferred<void>();
    mocks.update.mockImplementation(async () => { await update.promise; return { data: { user: original.user }, error: null }; });
    mocks.fetch.mockImplementation(async () => { await update.promise; return new Response(JSON.stringify(original.user), { status: 200 }); });
    render(<ResetPasswordPage />); await fillAndSubmit();
    await waitFor(() => expect(mocks.update.mock.calls.length + mocks.fetch.mock.calls.length).toBe(1));
    adopt(replacement);
    await act(async () => { update.resolve(); });
    expect(mocks.rawSignOut).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(storageKey)!).user.id).toBe('account-b');
    expect(mocks.navigate).not.toHaveBeenCalled(); expect(mocks.toast).not.toHaveBeenCalled();
  });

  it('updates the verified recovery owner, ends only that session, and preserves unrelated local drafts', async () => {
    localStorage.setItem('owned-draft', 'keep');
    render(<ResetPasswordPage />); await fillAndSubmit();
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/auth', { replace: true }));
    expect(mocks.fetch).toHaveBeenCalledWith(`${backend}/auth/v1/user`, expect.objectContaining({
      method: 'PUT', redirect: 'error', body: JSON.stringify({ password: 'new-fixture-password' }),
      headers: { apikey: 'public-fixture-key', Authorization: `Bearer ${original.access_token}`, 'Content-Type': 'application/json' },
    }));
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.rawSignOut).not.toHaveBeenCalled();
    expect(mocks.revoke).toHaveBeenCalledWith(original.access_token, 'local');
    expect(localStorage.getItem(storageKey)).toBeNull(); expect(localStorage.getItem('owned-draft')).toBe('keep');
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Password updated' }));
  });

  it.each([replacement, session('account-a', 'new-session-a')])('does not update a replacement session already present at submit (%j)', async newer => {
    render(<ResetPasswordPage />); await screen.findByPlaceholderText('Enter your new password');
    adopt(newer); await fillAndSubmit();
    await screen.findByText('Your sign-in changed. This recovery form can no longer be used.');
    expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.ownedSignOut).not.toHaveBeenCalled();
  });

  it('uses the refreshed access token for the same recovery session', async () => {
    render(<ResetPasswordPage />); await screen.findByPlaceholderText('Enter your new password');
    const rotated = { ...original, access_token: `fixture.${btoa(JSON.stringify({ sub: 'account-a', session_id: 'session-a', rotation: 2 }))}.fixture` };
    adopt(rotated); await fillAndSubmit();
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/auth', { replace: true }));
    expect(mocks.fetch.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${rotated.access_token}`);
    expect(mocks.revoke).toHaveBeenCalledWith(rotated.access_token, 'local');
  });

  it('rechecks the owner after awaiting the current SDK session', async () => {
    render(<ResetPasswordPage />); await screen.findByPlaceholderText('Enter your new password');
    const read = deferred<{ data: { session: Session }; error: null }>();
    mocks.getSession.mockReturnValueOnce(read.promise);
    await fillAndSubmit(); adopt(replacement);
    await act(async () => { read.resolve({ data: { session: replacement }, error: null }); });
    expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.ownedSignOut).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('preserves a later session for A after A → B → A while the password update is pending', async () => {
    const update = deferred<Response>(); mocks.fetch.mockReturnValueOnce(update.promise);
    render(<ResetPasswordPage />); await fillAndSubmit();
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    adopt(replacement); const newer = session('account-a', 'new-session-a'); adopt(newer);
    await act(async () => { update.resolve(new Response(JSON.stringify(original.user), { status: 200 })); });
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(newer));
    expect(mocks.revoke).toHaveBeenCalledWith(original.access_token, 'local');
    expect(mocks.navigate).not.toHaveBeenCalled(); expect(mocks.toast).not.toHaveBeenCalled();
  });

  it('does not redirect B arriving during exact-session cleanup', async () => {
    const revoke = deferred<{ error: null }>(); mocks.revoke.mockReturnValueOnce(revoke.promise);
    render(<ResetPasswordPage />); await fillAndSubmit();
    await waitFor(() => expect(mocks.revoke).toHaveBeenCalledTimes(1));
    adopt(replacement); await act(async () => { revoke.resolve({ error: null }); });
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(replacement));
    expect(mocks.navigate).not.toHaveBeenCalled(); expect(mocks.toast).not.toHaveBeenCalled();
  });

  it('keeps a confirmed password update separate from failed cleanup and retries only cleanup', async () => {
    mocks.revoke.mockResolvedValueOnce({ error: { status: 500, message: 'Unavailable' } });
    render(<ResetPasswordPage />); await fillAndSubmit();
    await screen.findByText(/Your password was updated, but signing out could not be completed/);
    expect(screen.getByText('Your password has been updated.')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Enter your new password')).toBeNull();
    expect(mocks.toast).not.toHaveBeenCalled(); expect(mocks.navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Finish signing out' }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/auth', { replace: true }));
    expect(mocks.fetch).toHaveBeenCalledTimes(1); expect(mocks.revoke).toHaveBeenCalledTimes(2);
  });

  it('shows a real password rejection without claiming success or ending the session', async () => {
    mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ msg: 'The password is too weak.' }), { status: 422 }));
    render(<ResetPasswordPage />); await fillAndSubmit();
    await screen.findByText('The password is too weak.');
    expect(screen.getByPlaceholderText('Enter your new password')).toBeTruthy();
    expect(mocks.ownedSignOut).not.toHaveBeenCalled(); expect(mocks.toast).not.toHaveBeenCalled();
  });

  it('does not navigate or announce success after the recovery page unmounts', async () => {
    const update = deferred<Response>(); mocks.fetch.mockReturnValueOnce(update.promise);
    const page = render(<ResetPasswordPage />); await fillAndSubmit();
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1)); page.unmount(); adopt(replacement);
    await act(async () => { update.resolve(new Response(JSON.stringify(original.user), { status: 200 })); });
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(replacement));
    expect(mocks.navigate).not.toHaveBeenCalled(); expect(mocks.toast).not.toHaveBeenCalled();
  });

  it.each(recoveryUrls)('preserves recovery URL handling and removes sensitive parameters (%s)', async (url, kind) => {
    window.history.replaceState({}, '', url); render(<ResetPasswordPage />);
    await screen.findByPlaceholderText('Enter your new password');
    if (kind === 'implicit') expect(mocks.setSession).toHaveBeenCalledWith({ access_token: 'fixture-access', refresh_token: 'fixture-refresh' });
    if (kind === 'code') expect(mocks.exchange).toHaveBeenCalledWith('fixture-code');
    if (kind === 'hash') expect(mocks.verify).toHaveBeenCalledWith({ token_hash: 'fixture-hash', type: 'recovery' });
    if (kind === 'otp') expect(mocks.verify).toHaveBeenCalledWith({ token: 'fixture-otp', type: 'recovery', email: 'fixture@example.invalid' });
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/reset-password');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('keeps an expired link unavailable instead of exposing the password form', async () => {
    adopt(null); render(<ResetPasswordPage />);
    await screen.findByText('Your reset link is invalid or has expired. Please request a new one.');
    expect(screen.queryByPlaceholderText('Enter your new password')).toBeNull();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

describe('captured recovery password transport', () => {
  it.each(['wrong-user', 'malformed', 'network', 'server'])('does not treat %s as confirmed success', async kind => {
    if (kind === 'wrong-user') mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify(replacement.user), { status: 200 }));
    if (kind === 'malformed') mocks.fetch.mockResolvedValueOnce(new Response('not-json', { status: 200 }));
    if (kind === 'network') mocks.fetch.mockRejectedValueOnce(new Error('connection interrupted'));
    if (kind === 'server') mocks.fetch.mockResolvedValueOnce(new Response('{}', { status: 503 }));
    await expect(updateRecoveryPassword(original, 'fixture-password')).rejects.toThrow('could not be confirmed');
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(original));
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.ownedSignOut).not.toHaveBeenCalled();
  });

  it('bounds the entire request, aborts on timeout, and ignores a late returned user', async () => {
    vi.useFakeTimers(); const response = deferred<Response>(); mocks.fetch.mockReturnValueOnce(response.promise);
    const outcome = updateRecoveryPassword(original, 'fixture-password').then(() => null, error => error);
    await vi.advanceTimersByTimeAsync(20_000);
    expect((await outcome).message).toContain('could not be confirmed');
    expect(mocks.fetch.mock.calls[0][1].signal.aborted).toBe(true);
    adopt(replacement); response.resolve(new Response(JSON.stringify(original.user), { status: 200 }));
    await Promise.resolve();
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(replacement)); expect(mocks.update).not.toHaveBeenCalled();
  });
});
