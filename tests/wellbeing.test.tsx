import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { decodeCheckin, fetchWellbeingPeople, listWellbeing, readWellbeingReceipt, saveWellbeingCheckin, WELLBEING_REQUEST_TIMEOUT_MS } from '@/data/wellbeing/api';
import { type WellbeingRequest, type WellbeingScope } from '@/data/wellbeing/types';
import { clearWellbeingDraft, earlierWellbeingDrafts, makeWellbeingRequest, readWellbeingDraft, storeWellbeingDraft } from '@/data/wellbeing/draft';
import { useWellbeingDraft } from '@/data/wellbeing/useWellbeingDraft';
import { fetchWellbeingSeries } from '@/data/wellbeing/queries/useWellbeingSeries';
import { dateRange, localDateAt } from '@/data/wellbeing/calendar';
import { computeWellbeingScore, transformMetricsForDisplay } from '@/lib/wellbeingUtils';
import WellbeingForm from '@/components/wellbeing/WellbeingForm';
import EarlierWellbeingDrafts from '@/components/wellbeing/EarlierWellbeingDrafts';
import WellbeingHistory from '@/components/wellbeing/WellbeingHistory';
import MoodHealthBar from '@/components/wellbeing/MoodHealthBar';
import CompactWellbeingMetrics from '@/components/wellbeing/CompactWellbeingMetrics';

const mocks = vi.hoisted(() => ({ network: vi.fn() }));
vi.mock('@/contexts/UserIdsContext', () => ({ useUserIds: () => ({}) }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabaseBackendId: 'fixture', supabase: createClient('https://wellbeing-fixture.invalid', 'fixture-public-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: mocks.network },
  }) };
});
const scope: WellbeingScope = { backendId: 'fixture', accountId: 'A', relationshipId: 'period-A', relationshipSessionId: 'session-A' };
const zero = { anxiety: 100, stress: 100, irritability: 100, overwhelm: 100, energy: 0, intimacy: 100, physical_touch: 100, emotional_support: 100 };
const request = (): WellbeingRequest => makeWellbeingRequest(scope, 'America/Boise', zero);
const receipt = (r: WellbeingRequest, extra: Record<string, unknown> = {}) => ({
  id: `row-${r.commandId}`, userId: r.scope.accountId, participantId: 'participant', relationshipId: r.scope.relationshipId,
  relationshipSessionId: r.scope.relationshipSessionId, commandId: r.commandId, metrics: r.metrics, overallScore: computeWellbeingScore(r.metrics),
  scoreVersion: 'needs-v1', recordedAt: '2026-10-27T18:00:00Z', clientReportedAt: r.clientReportedAt, timezone: r.expectedTimezone,
  localDate: '2026-10-27', provenance: 'confirmed_checkin', legacyCreatedAt: null, legacyUpdatedAt: null, ...extra,
});
const legacy = { id: 'legacy', userId: 'A', participantId: null, relationshipId: scope.relationshipId, relationshipSessionId: null, commandId: null,
  metrics: { energy: 0 }, overallScore: 7, scoreVersion: null, recordedAt: null, clientReportedAt: null, timezone: null, localDate: null,
  provenance: 'legacy_snapshot', legacyCreatedAt: '2024-01-01T00:00:00Z', legacyUpdatedAt: '2025-02-03T18:00:00Z' };
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
const session = (id: string) => ({ data: { session: { user: { id }, access_token: `fixture-${id}`, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600 } as Session }, error: null });
const calls: { name: string; actor: string; args: Record<string, unknown>; signal?: AbortSignal }[] = [];
let handle: (name: string, args: Record<string, unknown>) => Response | Promise<Response>;
const requestFromArgs = (args: Record<string, unknown>): WellbeingRequest => ({ scope, commandId: args.p_command_id as string, metrics: args.p_metrics as typeof zero, expectedTimezone: args.p_expected_timezone as string, clientReportedAt: args.p_client_reported_at as string });
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
}
beforeEach(() => {
  localStorage.clear(); calls.length = 0; mocks.network.mockReset();
  vi.spyOn(supabase.auth, 'getSession').mockResolvedValue(session('A'));
  handle = (name, args) => name === 'save_wellbeing_checkin' ? response(receipt(requestFromArgs(args))) : response(name === 'get_my_wellbeing_receipt' ? null : []);
  mocks.network.mockImplementation(async (url: string, init: RequestInit) => {
    const name = new URL(url).pathname.split('/').at(-1)!;
    const args = JSON.parse(init.body as string);
    const actor = new Headers(init.headers).get('Authorization')!.replace('Bearer fixture-', '');
    calls.push({ name, actor, args, signal: init.signal as AbortSignal });
    return handle(name, args);
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('wellbeing values and scoped transport', () => {
  it('preserves seven inverse scales and positive energy, including actual zero and missing values', () => {
    expect(computeWellbeingScore(zero)).toBe(0);
    expect(computeWellbeingScore({ ...zero, energy: 100 })).toBe(13);
    expect(computeWellbeingScore({ ...zero, anxiety: 0 })).toBe(13);
    expect(() => computeWellbeingScore({ energy: 0 })).toThrow();
    const old = decodeCheckin(legacy, scope, 'A');
    expect(old.overallScore).toBe(7); expect(old.metrics).toEqual({ energy: 0 }); expect(old.localDate).toBeNull(); expect(old.timezone).toBeNull();
    expect(old.legacyCreatedAt).toBe(legacy.legacyCreatedAt); expect(old.legacyUpdatedAt).toBe(legacy.legacyUpdatedAt);
    expect(transformMetricsForDisplay(old.metrics).find(x => x.key === 'energy')?.value).toBe(0);
    expect(transformMetricsForDisplay(old.metrics).find(x => x.key === 'stress')?.value).toBeNull();
    expect(() => decodeCheckin({ ...legacy, localDate: '2025-02-03' }, scope)).toThrow();
  });

  it('rejects account changes before session resolution and pins the checked token afterward for reads and saves', async () => {
    const pending = deferred<ReturnType<typeof session>>(); vi.mocked(supabase.auth.getSession).mockReturnValueOnce(pending.promise);
    const reading = fetchWellbeingPeople(scope); pending.resolve(session('B'));
    await expect(reading).rejects.toThrow('ACCOUNT_CHANGED'); expect(calls).toHaveLength(0);
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce(session('A')).mockResolvedValue(session('B'));
    await fetchWellbeingPeople(scope); expect(calls[0].actor).toBe('A');
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce(session('A')).mockResolvedValue(session('B'));
    await saveWellbeingCheckin(request()); expect(calls[1].actor).toBe('A');
    expect(calls[1].args.p_expected_relationship_session_id).toBe('session-A');
    await expect(saveWellbeingCheckin(request())).rejects.toThrow('ACCOUNT_CHANGED'); expect(calls).toHaveLength(2);
  });

  it('distinguishes receipt not-found from unavailable and rejects a rebound receipt', async () => {
    const r = request(); expect(await readWellbeingReceipt(r)).toBeNull();
    handle = () => response({ message: 'unavailable' }, 503);
    await expect(readWellbeingReceipt(r)).rejects.toThrow('unavailable');
    handle = () => response(receipt(r, { relationshipSessionId: 'new-session' }));
    await expect(readWellbeingReceipt(r)).rejects.toThrow('INVALID_WELLBEING_RESPONSE');
  });

  it('uses explicit dated or legacy list modes and never accepts a different day as date fallback', async () => {
    const range = { start: '2026-10-27', end: '2026-10-28' };
    await listWellbeing(scope, 'A', range); expect(calls[0].args).toMatchObject({ p_mode: 'dated', p_limit: 100, p_start_date: range.start });
    handle = () => response([legacy]); expect(await listWellbeing(scope, 'A', null)).toHaveLength(1);
    expect(calls[1].args).toMatchObject({ p_mode: 'legacy', p_start_date: null, p_end_date: null });
    handle = () => response([receipt(request(), { localDate: '2026-10-26' })]);
    await expect(listWellbeing(scope, 'A', range)).rejects.toThrow('INVALID_WELLBEING_RESPONSE');
  });

  it('plots latest actual readings per saved day and actual role, retaining gaps and zero', async () => {
    const r = request(); const day1 = receipt(r, { id: 'first', localDate: '2026-10-26', overallScore: 0 });
    const day2 = receipt(r, { id: 'newest', localDate: '2026-10-27', overallScore: 80 });
    handle = name => response(name === 'get_wellbeing_status' ? [{ userId: 'A', role: 'dom', timezone: 'America/Boise', latest: day2 }] : [day2, { ...day2, id: 'older', overallScore: 40 }, day1]);
    const series = await fetchWellbeingSeries(scope, dateRange('2026-10-27', false));
    expect(series[0]).toMatchObject({ domScore: 0, domHasData: true, subScore: null, subHasData: false });
    expect(series[1].domScore).toBe(80); expect(series[2].domScore).toBeNull();
    expect(localDateAt('America/Boise', new Date('2026-10-27T02:00:00Z'))).toBe('2026-10-26');
    expect(dateRange('2026-11-01', false).dates).toHaveLength(7); // DST and month boundary.
  });

  it('bounds hanging session resolution and caller cancellation without later sending', async () => {
    vi.useFakeTimers(); const pending = deferred<ReturnType<typeof session>>(); vi.mocked(supabase.auth.getSession).mockReturnValue(pending.promise);
    const hung = expect(fetchWellbeingPeople(scope)).rejects.toThrow('WELLBEING_REQUEST_TIMEOUT');
    await vi.advanceTimersByTimeAsync(WELLBEING_REQUEST_TIMEOUT_MS); await hung;
    pending.resolve(session('A')); await Promise.resolve(); expect(calls).toHaveLength(0);
    const pending2 = deferred<ReturnType<typeof session>>(); vi.mocked(supabase.auth.getSession).mockReturnValue(pending2.promise);
    const controller = new AbortController(); const cancelled = expect(fetchWellbeingPeople(scope, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort(); await cancelled; pending2.resolve(session('A')); await Promise.resolve(); expect(calls).toHaveLength(0);
  });
});

describe('saved report recovery and UI', () => {
  it('persists the original intent through an unknown save and reload; receipt recovery does not append again', async () => {
    handle = name => response(name === 'save_wellbeing_checkin' ? { message: 'unavailable' } : null, name === 'save_wellbeing_checkin' ? 503 : 200);
    const first = renderHook(() => useWellbeingDraft(scope, 'America/Boise', null), { wrapper: wrapper() });
    await act(async () => { await first.result.current.save(); });
    const saved = readWellbeingDraft(scope)!; expect(saved.pending).toBeTruthy(); expect(first.result.current.confirmation).toBeNull();
    first.unmount(); handle = () => response(receipt(saved.pending!));
    const second = renderHook(() => useWellbeingDraft(scope, 'America/Boise', null), { wrapper: wrapper() });
    expect(second.result.current.draft.pending).toEqual(saved.pending);
    await act(async () => { await second.result.current.save(); });
    expect(calls.filter(x => x.name === 'save_wellbeing_checkin')).toHaveLength(1);
    expect(second.result.current.confirmation?.commandId).toBe(saved.pending!.commandId); expect(readWellbeingDraft(scope)).toBeNull();
    expect(calls.filter(x => x.name === 'get_my_wellbeing_receipt').every(x => x.args.p_command_id === saved.pending!.commandId)).toBe(true);
  });

  it('times out a hanging save, keeps its exact draft, then recovers the committed receipt', async () => {
    vi.useFakeTimers(); const pending = deferred<Response>();
    handle = name => name === 'save_wellbeing_checkin' ? pending.promise : response(null);
    const hook = renderHook(() => useWellbeingDraft(scope, 'America/Boise', null), { wrapper: wrapper() });
    let saving!: Promise<void>; act(() => { saving = hook.result.current.save(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(calls.filter(x => x.name === 'save_wellbeing_checkin')).toHaveLength(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(WELLBEING_REQUEST_TIMEOUT_MS); await saving; });
    expect(hook.result.current.saving).toBe(false); expect(hook.result.current.error).toMatch(/timed out/);
    const saved = readWellbeingDraft(scope)!; expect(saved.pending).toBeTruthy();
    expect(calls.at(-1)!.signal?.aborted).toBe(true);
    handle = () => response(receipt(saved.pending!));
    await act(async () => { await hook.result.current.save(); });
    expect(hook.result.current.confirmation?.commandId).toBe(saved.pending!.commandId);
    expect(calls.filter(x => x.name === 'save_wellbeing_checkin')).toHaveLength(1);
    pending.resolve(response(receipt(saved.pending!))); // Late original response cannot create another intent.
  });

  it('does not send when receipt lookup is unavailable or local persistence fails', async () => {
    handle = () => response({ message: 'unavailable' }, 503);
    const hook = renderHook(() => useWellbeingDraft(scope, 'America/Boise', null), { wrapper: wrapper() });
    await act(async () => { await hook.result.current.save(); });
    expect(calls.some(x => x.name === 'save_wellbeing_checkin')).toBe(false); expect(readWellbeingDraft(scope)?.pending).toBeTruthy();
    hook.unmount(); localStorage.clear(); calls.length = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    const blocked = renderHook(() => useWellbeingDraft(scope, 'America/Boise', null), { wrapper: wrapper() });
    await act(async () => { await blocked.result.current.save(); });
    expect(calls).toHaveLength(0); expect(blocked.result.current.error).toMatch(/Nothing was sent/);
  });

  it('preserves unknown timezone intent until a not-found result allows explicit review', async () => {
    const old = request(); storeWellbeingDraft({ version: 1, scope, metrics: old.metrics, pending: old });
    const hook = renderHook(() => useWellbeingDraft(scope, 'Europe/London', null), { wrapper: wrapper() });
    await act(async () => { await hook.result.current.save(); });
    expect(hook.result.current.canReview).toBe(true); expect(calls.some(x => x.name === 'save_wellbeing_checkin')).toBe(false);
    expect(readWellbeingDraft(scope)?.pending?.expectedTimezone).toBe('America/Boise');
    act(() => hook.result.current.review()); expect(hook.result.current.draft.pending).toBeNull();
    await act(async () => { await hook.result.current.save(); });
    const next = calls.find(x => x.name === 'save_wellbeing_checkin')!;
    expect(next.args.p_expected_timezone).toBe('Europe/London'); expect(next.args.p_command_id).not.toBe(old.commandId);
  });

  it('ignores a delayed receipt after unmount/account switch and keeps the old account draft separate', async () => {
    const pending = deferred<Response>(); handle = () => pending.promise;
    const old = renderHook(() => useWellbeingDraft(scope, 'America/Boise', null), { wrapper: wrapper() });
    let saving!: Promise<void>; act(() => { saving = old.result.current.save(); });
    await waitFor(() => expect(calls).toHaveLength(1)); old.unmount();
    const other = { ...scope, accountId: 'B', relationshipId: 'period-B', relationshipSessionId: 'session-B' };
    vi.mocked(supabase.auth.getSession).mockResolvedValue(session('B'));
    const next = renderHook(() => useWellbeingDraft(other, 'America/Boise', null), { wrapper: wrapper() });
    await act(async () => { pending.resolve(response(null)); await saving; });
    expect(calls).toHaveLength(1); expect(next.result.current.draft.pending).toBeNull(); expect(next.result.current.confirmation).toBeNull();
    expect(readWellbeingDraft(scope)?.pending).toBeTruthy(); expect(readWellbeingDraft(other)).toBeNull();
  });

  it('scopes earlier drafts to this account/backend, checks original receipts only and preserves not-found reports', async () => {
    const old = request(); storeWellbeingDraft({ version: 1, scope, metrics: old.metrics, pending: old });
    const next = { ...scope, relationshipSessionId: 'session-new' };
    const other = { ...scope, accountId: 'B' }, wrongBackend = { ...scope, backendId: 'another' };
    for (const s of [other, wrongBackend]) { const r = { ...request(), scope: s }; storeWellbeingDraft({ version: 1, scope: s, metrics: r.metrics, pending: r }); }
    expect(earlierWellbeingDrafts(next).drafts).toHaveLength(1);
    render(<EarlierWellbeingDrafts scope={next} />, { wrapper: wrapper() });
    fireEvent.click(screen.getByRole('button', { name: 'Check original result' }));
    await screen.findByText(/No confirmed result was found/); expect(readWellbeingDraft(scope)?.pending).toBeTruthy();
    expect(calls).toHaveLength(1); expect(calls[0].name).toBe('get_my_wellbeing_receipt'); expect(calls[0].args.p_relationship_id).toBe(scope.relationshipId);
    handle = () => response({ message: 'unavailable' }, 503); fireEvent.click(screen.getByRole('button', { name: 'Check original result' }));
    await screen.findByText(/original result could not be checked/); expect(readWellbeingDraft(scope)?.pending).toBeTruthy();
    handle = () => response(receipt(old)); fireEvent.click(screen.getByRole('button', { name: 'Check original result' }));
    await screen.findByText(/Original check-in confirmed/); fireEvent.click(screen.getByRole('button', { name: 'Dismiss recovered report' }));
    expect(readWellbeingDraft(scope)).toBeNull(); expect(readWellbeingDraft(other)).toBeTruthy(); expect(calls.every(x => x.name === 'get_my_wellbeing_receipt')).toBe(true);
    expect(() => clearWellbeingDraft(scope, old.commandId)).not.toThrow();
  });

  it('renders eight editable unsaved controls, zero and missing readings truthfully, without sending on change', () => {
    render(<WellbeingForm scope={scope} timezone="America/Boise" latest={null} />, { wrapper: wrapper() });
    expect(screen.getAllByRole('slider')).toHaveLength(8); expect(screen.getByText(/starting values are an unsaved draft/)).toBeTruthy();
    fireEvent.change(screen.getByRole('slider', { name: 'Energy Level' }), { target: { value: '100' } });
    expect((screen.getByRole('slider', { name: 'Energy Level' }) as HTMLInputElement).value).toBe('100');
    expect(readWellbeingDraft(scope)?.metrics.energy).toBe(100); expect(calls).toHaveLength(0);
    cleanup(); render(<><MoodHealthBar score={0} /><MoodHealthBar score={null} /><CompactWellbeingMetrics metrics={{ energy: 0 }} selectedDate="2026-10-27" selectedUserType="sub" /></>);
    expect(screen.getByRole('button', { name: 'Wellbeing: 0/100' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'No saved wellbeing check-in' })).toBeTruthy();
    expect(screen.getAllByText('Not recorded').length).toBeGreaterThan(0); expect(screen.getByText('0%')).toBeTruthy();
  });

  it('shows imported history separately with both timestamps and no invented local date', async () => {
    handle = (_name, args) => response(args.p_mode === 'legacy' ? [legacy] : []);
    render(<WellbeingHistory scope={scope} timezone="America/Boise" />, { wrapper: wrapper() });
    await screen.findByText(/Imported status records · original local dates unknown/);
    expect(screen.getByText(/No check-ins recorded in this month/)).toBeTruthy();
    expect(screen.getByText(/Earlier overwritten check-ins cannot be recovered/)).toBeTruthy();
    expect(screen.getByText(/Stored score retained/)).toBeTruthy(); expect(screen.getAllByText('Not recorded')).toHaveLength(7);
    expect(calls.find(x => x.args.p_mode === 'dated')!.args.p_start_date).toBeTruthy();
  });
});
