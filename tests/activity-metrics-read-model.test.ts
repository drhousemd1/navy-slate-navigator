import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseBackendId } from '@/integrations/supabase/client';
import { readMetricClocks, readMetricsSource } from '@/data/metrics/readModel';
import { scope as baseScope, uuid } from './action-queue.helpers';

const mocks = vi.hoisted(() => ({ network: vi.fn() }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const url = 'https://metrics-fixture.invalid';
  return { supabaseBackendId: url, supabase: createClient(url, 'fixture-public-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: mocks.network },
  }) };
});
const scope = { ...baseScope, backendId: supabaseBackendId };
const session = (id = scope.accountId) => ({ data: { session: { user: { id }, access_token: `synthetic-${id}`, token_type: 'bearer', refresh_token: 'unused', expires_in: 3600 } as Session }, error: null });
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const identity = () => ({ user_id: scope.accountId, relationship_id: scope.relationshipId, participant_id: scope.participantId });
const history = (id: number) => ({ id: uuid(id), relationship_id: scope.relationshipId, completed_at: '2026-10-26T12:00:00Z' });
const event = () => ({ id: uuid(900), relationship_id: scope.relationshipId, kind: 'task_completed', beneficiary_participant_id: scope.participantId,
  subject: { role: 'sub' }, calendar: { participantId: scope.participantId, localDate: '2026-10-26', weekStartDate: '2026-10-26', timeZone: 'America/Boise' }, reverses_event_id: null });
beforeEach(() => {
  vi.spyOn(supabase.auth, 'getSession').mockResolvedValue(session());
  mocks.network.mockImplementation((input: string) => response(input.includes('/rpc/get_my_identity') ? identity() : []));
});
describe('actual SDK metrics read path (network stubbed)', () => {
  it('pages all retained history and reads atomic events without current-definition joins or private snapshots', async () => {
    mocks.network.mockImplementation((input: string) => {
      const url = new URL(input), table = url.pathname.split('/').pop();
      if (table === 'get_my_identity') return response(identity());
      if (table === 'action_events') return response([event()]);
      if (table === 'task_completion_history') return response(url.searchParams.get('offset') === '0' ? Array.from({ length: 500 }, (_, i) => history(1000 + i)) : [history(1500)]);
      return response([]);
    });
    const result = await readMetricsSource(scope, 'atomic');
    expect(result.events).toHaveLength(1); expect(result.legacy).toHaveLength(501);
    for (const [input, init] of mocks.network.mock.calls as [string, RequestInit][]) {
      const url = new URL(input);
      expect(new Headers(init.headers).get('Authorization')).toBe(`Bearer synthetic-${scope.accountId}`);
      expect(url.pathname).not.toMatch(/action_task_openings|relationship_period_members|action_accounting_periods/);
      expect(url.searchParams.get('select') ?? '').not.toMatch(/source_snapshot|tasks\(|rewards\(/);
      if (!url.pathname.includes('/rpc/')) expect(url.searchParams.get('relationship_id')).toBe(`eq.${scope.relationshipId}`);
      if (/task_completion_history|rule_violations|reward_usage|punishment_history/.test(url.pathname)) expect(url.searchParams.get('action_event_id')).toBe('is.null');
    }
  });
  it('uses legacy left joins only in disabled mode and preserves orphan records', async () => {
    mocks.network.mockImplementation((input: string) => response(input.includes('get_my_identity') ? identity()
      : input.includes('task_completion_history') ? [{ ...history(100), tasks: { is_dom_task: true } }, { ...history(101), tasks: null }] : []));
    const result = await readMetricsSource(scope, 'legacy');
    expect(result.legacy.map(row => row.role)).toEqual(['dom', null]);
    const urls = mocks.network.mock.calls.map(([input]) => decodeURIComponent(String(input)));
    expect(urls.join('\n')).toContain('tasks(is_dom_task)');
    expect(urls.join('\n')).not.toContain('!inner');
    expect(urls.join('\n')).not.toContain('/action_events');
  });
  it('reads only the permitted canonical pair’s saved clocks', async () => {
    const partner = uuid(999);
    mocks.network.mockImplementation((input: string) => response(input.includes('get_my_identity') ? identity() : [
      { id: scope.accountId, role: 'sub', timezone: 'America/Boise' }, { id: partner, role: 'dom', timezone: 'Europe/London' },
    ]));
    expect(await readMetricClocks(scope, { subUserId: scope.accountId, domUserId: partner })).toEqual([
      { role: 'sub', timeZone: 'America/Boise' }, { role: 'dom', timeZone: 'Europe/London' },
    ]);
    const url = new URL(mocks.network.mock.calls[0][0]);
    expect(url.searchParams.get('id')).toBe(`in.(${scope.accountId},${partner})`);
    expect(url.searchParams.get('select')).toBe('id,role,timezone');
  });
  it('reports a missing saved clock instead of silently using the browser’s timezone', async () => {
    mocks.network.mockResolvedValue(response([{ id: scope.accountId, role: 'sub', timezone: null }]));
    await expect(readMetricClocks(scope, { subUserId: scope.accountId, domUserId: null })).rejects.toThrow('saved timezone');
  });
  it('rejects denied or partial reads instead of returning zero', async () => {
    mocks.network.mockImplementation((input: string) => input.includes('rule_violations') ? response({ message: 'Denied' }, 403) : response(input.includes('get_my_identity') ? identity() : []));
    await expect(readMetricsSource(scope, 'atomic')).rejects.toThrow('could not be verified');
  });
  it('rejects a cross-period row and an identity switch after fetching', async () => {
    mocks.network.mockImplementation((input: string) => response(input.includes('action_events') ? [{ ...event(), relationship_id: uuid(999) }] : input.includes('get_my_identity') ? identity() : []));
    await expect(readMetricsSource(scope, 'atomic')).rejects.toThrow('could not be verified');
    mocks.network.mockImplementation((input: string) => response(input.includes('get_my_identity') ? { ...identity(), relationship_id: uuid(999) } : []));
    await expect(readMetricsSource(scope, 'atomic')).rejects.toThrow('could not be verified');
  });
  it('does not send when account/backend is stale, or when cancellation already happened', async () => {
    await expect(readMetricsSource({ ...scope, backendId: 'https://different.invalid' }, 'atomic')).rejects.toThrow();
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue(session(uuid(99)));
    await expect(readMetricsSource(scope, 'atomic')).rejects.toThrow('account changed');
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue(session());
    const controller = new AbortController(); controller.abort();
    await expect(readMetricsSource(scope, 'atomic', controller.signal)).rejects.toThrow('Cancelled');
    expect(mocks.network).not.toHaveBeenCalled();
  });
  it('pins the captured account token and discards results when the account changes during reads', async () => {
    let first = true;
    mocks.network.mockImplementation((input: string, init: RequestInit) => {
      expect(new Headers(init.headers).get('Authorization')).toBe(`Bearer synthetic-${scope.accountId}`);
      if (first) { first = false; vi.spyOn(supabase.auth, 'getSession').mockResolvedValue(session(uuid(99))); }
      return response(input.includes('get_my_identity') ? identity() : []);
    });
    await expect(readMetricsSource(scope, 'atomic')).rejects.toThrow('account changed');
  });
});
