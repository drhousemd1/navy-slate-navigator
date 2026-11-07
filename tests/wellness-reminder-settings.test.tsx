import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ accountId: 'A', read: vi.fn(), save: vi.fn() }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => ({ user: { id: mocks.accountId }, relationshipIdentity: { currentUserId: mocks.accountId, timezone: 'Europe/London' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://reminder.invalid' }));
vi.mock('@/data/notifications/api', () => ({ getWellnessReminder: mocks.read, saveWellnessReminder: mocks.save, notificationError: () => 'This notification setting could not be confirmed. Reload its saved state before trying again.' }));
vi.mock('@/components/ui/time-picker', () => ({ TimePicker: ({ value, onChange, disabled }) => <input aria-label="Reminder Time" value={value} onChange={event => onChange(event.target.value)} disabled={disabled} /> }));
import WellnessReminderSettings from '@/components/profile/WellnessReminderSettings';
import { useWellnessReminderData } from '@/data/wellbeing/useWellnessReminderData';
import { wellnessReminderKey } from '@/data/wellbeing/queries/useWellnessReminderQuery';
const saved = (userId = 'A', patch = {}) => ({ id: `reminder-${userId}`, user_id: userId, enabled: true, reminder_time: '09:00:00', timezone: 'Europe/London', next_due_at: '2026-10-28T09:00:00Z', last_sent: null, created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z', ...patch });
function setup() { const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); return { client, wrapper: ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider> }; }
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; };
beforeEach(() => { mocks.accountId = 'A'; mocks.read.mockReset().mockImplementation(async account => saved(account)); mocks.save.mockReset().mockImplementation(async (account, enabled, time) => saved(account, { enabled, reminder_time: `${time}:00`, next_due_at: enabled ? '2026-10-28T09:00:00Z' : null })); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('personal reminder RPC integration', () => {
  it('keeps Save reachable when disabling, sends no browser timezone, and shows only confirmed success', async () => {
    render(<WellnessReminderSettings />, { wrapper: setup().wrapper });
    const toggle = await screen.findByRole('switch', { name: 'Daily Wellness Reminder' }); await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'));
    fireEvent.click(toggle); expect(screen.queryByLabelText('Reminder Time')).toBeNull(); fireEvent.click(screen.getByRole('button', { name: 'Save Reminder' }));
    await screen.findByText('Wellness reminder disabled.'); expect(mocks.save).toHaveBeenCalledWith('A', false, '09:00', expect.any(AbortSignal));
    expect(mocks.save.mock.calls[0]).toHaveLength(4);
  });
  it('shows a confirmed disabled schedule after remount and rereading the saved setting', async () => {
    let persisted = saved();
    mocks.read.mockImplementation(async () => persisted);
    mocks.save.mockImplementation(async (account, enabled, time) => {
      persisted = saved(account, { enabled, reminder_time: `${time}:00`, next_due_at: null }); return persisted;
    });
    const view = render(<WellnessReminderSettings />, { wrapper: setup().wrapper });
    await waitFor(() => expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true'));
    fireEvent.click(screen.getByRole('switch')); fireEvent.click(screen.getByRole('button', { name: 'Save Reminder' }));
    await screen.findByText('Wellness reminder disabled.'); view.unmount();
    render(<WellnessReminderSettings />, { wrapper: setup().wrapper });
    await waitFor(() => expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(false));
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
    expect(screen.queryByText('Next scheduled reminder:')).toBeNull();
    expect(mocks.read).toHaveBeenCalledTimes(2); expect(mocks.save).toHaveBeenCalledOnce();
  });
  it('retains edited time after failed save and requires reloading the confirmed state before retry', async () => {
    render(<WellnessReminderSettings />, { wrapper: setup().wrapper }); await waitFor(() => expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(false));
    fireEvent.change(screen.getByLabelText('Reminder Time'), { target: { value: '10:35' } }); mocks.save.mockRejectedValueOnce(new Error('Unknown result')); fireEvent.click(screen.getByRole('button', { name: 'Save Reminder' }));
    await screen.findByRole('alert'); expect((screen.getByLabelText('Reminder Time') as HTMLInputElement).value).toBe('10:35'); expect((screen.getByRole('button', { name: 'Save Reminder' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText(/Reminder schedule saved/)).toBeNull(); fireEvent.click(screen.getByRole('button', { name: 'Reload saved reminder' }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Save Reminder' }) as HTMLButtonElement).disabled).toBe(false)); expect((screen.getByLabelText('Reminder Time') as HTMLInputElement).value).toBe('10:35');
    fireEvent.click(screen.getByRole('button', { name: 'Save Reminder' })); await screen.findByText('Reminder schedule saved for 10:35.');
  });
  it('does not fabricate next schedule from the browser clock while a time edit is unsaved', async () => {
    render(<WellnessReminderSettings />, { wrapper: setup().wrapper }); await screen.findByText('Next scheduled reminder:'); expect(screen.getByText('Europe/London')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Reminder Time'), { target: { value: '11:15' } }); expect(screen.queryByText('Next scheduled reminder:')).toBeNull();
  });
  it('does not clear a new account form or show old success when an old save resolves late', async () => {
    const pending = deferred<ReturnType<typeof saved>>(); mocks.save.mockReturnValue(pending.promise); const f = setup();
    const view = render(<WellnessReminderSettings />, { wrapper: f.wrapper }); await waitFor(() => expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(false));
    fireEvent.change(screen.getByLabelText('Reminder Time'), { target: { value: '10:35' } }); fireEvent.click(screen.getByRole('button', { name: 'Save Reminder' })); await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    mocks.accountId = 'B'; view.rerender(<WellnessReminderSettings />); await waitFor(() => expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(false));
    fireEvent.change(screen.getByLabelText('Reminder Time'), { target: { value: '14:25' } }); await act(async () => { pending.resolve(saved('A', { reminder_time: '10:35:00' })); });
    expect((screen.getByLabelText('Reminder Time') as HTMLInputElement).value).toBe('14:25'); expect(screen.queryByText('Reminder schedule saved for 10:35.')).toBeNull();
    expect(f.client.getQueryData(wellnessReminderKey('B'))).toMatchObject({ user_id: 'B', reminder_time: '09:00:00' });
  });
  it('unlocks the form and preserves the confirmed reminder when the shared API reports a timeout', async () => {
    const { result } = renderHook(useWellnessReminderData, { wrapper: setup().wrapper }); await waitFor(() => expect(result.current.isReady).toBe(true));
    mocks.save.mockRejectedValueOnce(new Error('NOTIFICATION_REQUEST_TIMEOUT'));
    await act(async () => { expect(await result.current.saveReminder(false, '09:00')).toBe(false); });
    expect(result.current.isSaving).toBe(false); expect(result.current.error).toBeTruthy(); expect(result.current.reminder?.enabled).toBe(true);
  });
  it('does not leave a returned account busy or let its old save clear a newer save', async () => {
    const first = deferred<ReturnType<typeof saved>>(); const second = deferred<ReturnType<typeof saved>>();
    mocks.save.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(useWellnessReminderData, { wrapper: setup().wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    let firstWork!: Promise<boolean>; act(() => { firstWork = result.current.saveReminder(true, '10:35'); }); await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    mocks.accountId = 'B'; rerender(); await waitFor(() => expect(result.current.isReady).toBe(true));
    mocks.accountId = 'A'; rerender(); await waitFor(() => expect(result.current.isReady).toBe(true));
    let secondWork!: Promise<boolean>; act(() => { secondWork = result.current.saveReminder(true, '14:25'); }); await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2));
    await act(async () => { first.resolve(saved('A', { reminder_time: '10:35:00' })); expect(await firstWork).toBe(false); });
    expect(result.current.isSaving).toBe(true); expect(result.current.reminder?.reminder_time).toBe('09:00:00');
    await act(async () => { second.resolve(saved('A', { reminder_time: '14:25:00' })); expect(await secondWork).toBe(true); });
    expect(result.current.isSaving).toBe(false); expect(result.current.reminder?.reminder_time).toBe('14:25:00');
  });
});
