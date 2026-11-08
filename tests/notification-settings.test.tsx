import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import Notifications from '@/pages/Notifications';
import { NotificationSettings } from '@/components/profile/NotificationSettings';

const mocks = vi.hoisted(() => ({ network: vi.fn(), accountId: 'A' as string | null, sessionId: 'A' as string | null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.accountId ? { id: mocks.accountId } : null }) }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabase: createClient('https://notification-fixture.invalid', 'fixture-public-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: mocks.network },
  }) };
});
vi.mock('@/hooks/usePushSubscription', () => ({ usePushSubscription: () => ({ isSubscribed: false, isSupported: false, isLoading: false, subscribe: vi.fn(), unsubscribe: vi.fn(), requestPermissionImmediately: vi.fn() }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('@/components/profile/WellnessReminderSettings', () => ({ default: () => null }));
const rows = new Map<string, unknown>();
const requests: { actor: string; method: string; body?: Record<string, unknown> }[] = [];
const pending = new Map<string, Promise<Response>[]>();
const session = (id: string | null) => ({ data: { session: id ? { user: { id }, access_token: `fixture-${id}`, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600 } as Session : null }, error: null });
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
  return { client, wrapper };
}
beforeEach(() => {
  rows.clear(); requests.length = 0; pending.clear(); mocks.accountId = 'A'; mocks.sessionId = 'A'; mocks.network.mockReset();
  vi.spyOn(supabase.auth, 'getSession').mockImplementation(async () => session(mocks.sessionId));
  mocks.network.mockImplementation(async (_url: string, init: RequestInit) => {
    const actor = new Headers(init.headers).get('Authorization')!.replace('Bearer fixture-', '');
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(init.body as string) as Record<string, unknown> : undefined;
    requests.push({ actor, method, body });
    const waiting = pending.get(`${method}:${actor}`)?.shift();
    if (waiting) return waiting;
    if (method === 'GET') return response(rows.has(actor) ? [{ user_id: actor, preferences: rows.get(actor) }] : []);
    rows.set(actor, body!.preferences);
    return response({ user_id: actor, preferences: body!.preferences });
  });
});
afterEach(cleanup);

describe('notification preference ownership and truthfulness', () => {
  it('fails closed until a verified missing row establishes first-use defaults, including refunds', async () => {
    const read = deferred<Response>(); pending.set('GET:A', [read.promise]);
    const { result } = renderHook(useNotificationSettings, { wrapper: setup().wrapper });
    expect(result.current.isReady).toBe(false); expect(result.current.preferences.enabled).toBe(false);
    expect(Object.values(result.current.preferences.types).every(value => !value)).toBe(true);
    await act(async () => read.resolve(response([])));
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.preferences.enabled).toBe(true); expect(result.current.preferences.types.rewardRefunded).toBe(true);
  });

  it('fails closed on read errors and malformed saved values, and recovers through Retry', async () => {
    pending.set('GET:A', [Promise.resolve(response({ message: 'denied' }, 403))]);
    const { result } = renderHook(useNotificationSettings, { wrapper: setup().wrapper });
    await waitFor(() => expect(result.current.loadError).toMatch(/could not be loaded/));
    expect(result.current.isReady).toBe(false); expect(result.current.preferences.enabled).toBe(false);
    rows.set('A', { enabled: 'yes', types: {} });
    await act(async () => { await result.current.loadPreferences(); });
    expect(result.current.isReady).toBe(false);
    rows.set('A', { enabled: true, types: { messages: false } });
    await act(async () => { await result.current.loadPreferences(); });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.preferences.types.messages).toBe(false); expect(result.current.preferences.types.rewardRefunded).toBe(true);
  });

  it('hides A immediately on account switch and ignores its delayed read after B loads', async () => {
    const read = deferred<Response>(); pending.set('GET:A', [read.promise]);
    rows.set('B', { enabled: false, types: { rewardRefunded: false } });
    const { result, rerender } = renderHook(useNotificationSettings, { wrapper: setup().wrapper });
    await waitFor(() => expect(requests).toHaveLength(1));
    mocks.accountId = 'B'; mocks.sessionId = 'B'; rerender();
    expect(result.current.preferences.enabled).toBe(false); expect(result.current.accountId).toBe('B');
    await waitFor(() => expect(result.current.isReady).toBe(true));
    await act(async () => read.resolve(response([{ user_id: 'A', preferences: { enabled: true, types: {} } }])));
    expect(result.current.preferences).toMatchObject({ enabled: false, types: { rewardRefunded: false } });
  });

  it('keeps confirmed toggles visible during refresh and save, while readiness blocks notification use', async () => {
    const { result } = renderHook(useNotificationSettings, { wrapper: setup().wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    const read = deferred<Response>(); pending.set('GET:A', [read.promise]);
    let refreshing!: Promise<void>; act(() => { refreshing = result.current.loadPreferences(); });
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(result.current.isReady).toBe(false); expect(result.current.preferences.enabled).toBe(true);
    await act(async () => { read.resolve(response([])); await refreshing; });
    const write = deferred<Response>(); pending.set('POST:A', [write.promise]);
    let saving!: Promise<void>; act(() => { saving = result.current.updateNotificationType('messages', false); });
    await waitFor(() => expect(result.current.isSaving).toBe(true));
    expect(result.current.isReady).toBe(false); expect(result.current.preferences.types.messages).toBe(true);
    const saved = { ...result.current.preferences, types: { ...result.current.preferences.types, messages: false } };
    await act(async () => { write.resolve(response({ user_id: 'A', preferences: saved })); await saving; });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.preferences.types.messages).toBe(false);
  });

  it('serializes two hook instances and merges the later change with the first confirmed save', async () => {
    const { result } = renderHook(() => ({ first: useNotificationSettings(), second: useNotificationSettings() }), { wrapper: setup().wrapper });
    await waitFor(() => expect(result.current.first.isReady && result.current.second.isReady).toBe(true));
    const write = deferred<Response>(); pending.set('POST:A', [write.promise]);
    let first!: Promise<void>; let second!: Promise<void>;
    act(() => { first = result.current.first.updateNotificationType('messages', false); second = result.current.second.updateNotificationType('rewardRefunded', false); });
    await waitFor(() => expect(requests.filter(request => request.method === 'POST')).toHaveLength(1));
    const body = requests.find(request => request.method === 'POST')!.body!;
    await act(async () => { write.resolve(response({ user_id: 'A', preferences: body.preferences })); await first; await second; });
    await waitFor(() => expect(result.current.second.isReady).toBe(true));
    const writes = requests.filter(request => request.method === 'POST');
    expect(writes).toHaveLength(2);
    expect(writes[1].body!.preferences).toMatchObject({ types: { messages: false, rewardRefunded: false } });
    expect(result.current.first.preferences).toEqual(result.current.second.preferences);
  });

  it('cancels a pre-save reload so its late result cannot overwrite confirmed preferences', async () => {
    const { result } = renderHook(useNotificationSettings, { wrapper: setup().wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    const read = deferred<Response>(); pending.set('GET:A', [read.promise]);
    act(() => { void result.current.loadPreferences(); });
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    await act(async () => { await result.current.updateNotificationType('rewardRefunded', false); });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    await act(async () => read.resolve(response([])));
    expect(result.current.preferences.types.rewardRefunded).toBe(false);
  });

  it('rejects a save if the checked SDK session belongs to another account, without posting', async () => {
    const { result } = renderHook(useNotificationSettings, { wrapper: setup().wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    mocks.sessionId = 'B';
    await act(async () => { await expect(result.current.toggleNotifications(false)).rejects.toThrow(/account changed/); });
    expect(requests.filter(request => request.method === 'POST')).toHaveLength(0);
    await waitFor(() => expect(result.current.loadError).toMatch(/could not be confirmed/));
    expect(result.current.preferences.enabled).toBe(false);
  });

  it('pins A’s checked token when the SDK reads session B again before sending the upsert', async () => {
    const { result } = renderHook(useNotificationSettings, { wrapper: setup().wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce(session('A')).mockResolvedValue(session('B'));
    await act(async () => { await result.current.updateNotificationType('rewardRefunded', false); });
    const write = requests.find(request => request.method === 'POST')!;
    expect(write.actor).toBe('A'); expect(write.body!.user_id).toBe('A');
  });

  it('pins the checked account token for reads even when the SDK session changes before fetch', async () => {
    rows.set('A', { enabled: true, types: { rewardRefunded: false } });
    rows.set('B', { enabled: false, types: {} });
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce(session('A')).mockResolvedValue(session('B'));
    const { result } = renderHook(useNotificationSettings, { wrapper: setup().wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(requests).toHaveLength(1); expect(requests[0].actor).toBe('A');
    expect(result.current.preferences.enabled).toBe(true);
    expect(result.current.preferences.types.rewardRefunded).toBe(false);
  });

  it('does not expose a late save to B or let an old callback continue as B', async () => {
    const { result, rerender } = renderHook(useNotificationSettings, { wrapper: setup().wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    const oldToggle = result.current.toggleNotifications;
    const write = deferred<Response>(); pending.set('POST:A', [write.promise]);
    let saving!: Promise<void>; act(() => { saving = result.current.updateNotificationType('messages', false); });
    await waitFor(() => expect(requests.some(request => request.method === 'POST')).toBe(true));
    mocks.accountId = 'B'; mocks.sessionId = 'B'; rows.set('B', { enabled: false, types: {} }); rerender();
    await waitFor(() => expect(result.current.isReady).toBe(true));
    const written = requests.find(request => request.method === 'POST')!.body!;
    await act(async () => { write.resolve(response({ user_id: 'A', preferences: written.preferences })); await expect(saving).rejects.toThrow(/account changed/); });
    await expect(oldToggle(true)).rejects.toThrow(/account changed/);
    expect(result.current.accountId).toBe('B'); expect(result.current.preferences.enabled).toBe(false);
  });
});

describe.each([['page', Notifications], ['profile section', NotificationSettings]] as const)('%s settings rendering', (_name, Component) => {
  it('renders Points Refunded with the deletion reason and a disabled/retryable error state', async () => {
    pending.set('GET:A', [Promise.resolve(response({ message: 'denied' }, 403))]);
    render(<Component />, { wrapper: setup().wrapper });
    await screen.findByRole('alert');
    expect(screen.getByText('Get notified when unused rewards are refunded')).toBeTruthy();
    expect((screen.getByRole('switch', { name: 'Points Refunded' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('switch', { name: 'Push Notifications' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Retry notification preferences' }));
    await waitFor(() => expect((screen.getByRole('switch', { name: 'Points Refunded' }) as HTMLButtonElement).disabled).toBe(false));
    expect(screen.getByRole('switch', { name: 'Points Refunded' }).getAttribute('aria-checked')).toBe('true');
  });
});
