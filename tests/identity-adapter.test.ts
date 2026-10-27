import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { callIdentityCommand, fetchIdentity, fetchLinkPreview, fetchPartnerLinkOptions } from '@/data/identity';

const mocks = vi.hoisted(() => ({ network: vi.fn() }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabase: createClient('https://identity-fixture.invalid', 'fixture-public-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: mocks.network },
  }) };
});
const session = (id: string): Session => ({ user: { id }, access_token: `fixture-access-${id}`, token_type: 'bearer', refresh_token: 'fixture-refresh', expires_in: 3600 }) as Session;
const sessionResult = (id: string) => ({ data: { session: session(id) }, error: null });
const response = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
beforeEach(() => {
  mocks.network.mockReset();
  mocks.network.mockResolvedValue(response({ saved: true }));
});

describe('real Supabase identity transport actor binding', () => {
  it('pins invitation choices to the checked account and reviewed connection generation', async () => {
    const period = '00000000-0000-4000-8000-000000000001', generation = '00000000-0000-4000-8000-000000000090';
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce(sessionResult('A')).mockResolvedValue(sessionResult('B'));
    mocks.network.mockResolvedValue(response({ relationship_id: period, relationship_session_id: generation, can_generate_fresh: true, invitation: null, archived_relationships: [] }));
    expect(await fetchPartnerLinkOptions('A', period, generation)).toMatchObject({ relationshipId: period, relationshipSessionId: generation });
    const [url, init] = mocks.network.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/rest/v1/rpc/get_my_partner_link_options');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer fixture-access-A');
    expect(JSON.parse(init.body as string)).toEqual({ p_expected_relationship_id: period, p_expected_relationship_session_id: generation });
  });

  it('rejects an A-origin command if the session resolves as B before token capture', async () => {
    const pending = deferred<ReturnType<typeof sessionResult>>();
    vi.spyOn(supabase.auth, 'getSession').mockReturnValueOnce(pending.promise);
    const saving = callIdentityCommand('A', 'set_my_profile_role', { p_role: 'sub' });
    pending.resolve(sessionResult('B'));
    await expect(saving).rejects.toThrow('ACCOUNT_CHANGED');
    expect(mocks.network).not.toHaveBeenCalled();
  });

  it('pins the checked A token even when the real SDK fetch wrapper subsequently reads session B', async () => {
    const getSession = vi.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce(sessionResult('A')).mockResolvedValue(sessionResult('B'));
    const result = await callIdentityCommand('A', 'initialize_my_timezone', { p_timezone: 'America/Boise' });
    expect(result).toEqual({ saved: true });
    expect(getSession).toHaveBeenCalledTimes(2); // Adapter check, then real SDK fetchWithAuth.
    const [url, init] = mocks.network.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/rest/v1/rpc/initialize_my_timezone');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer fixture-access-A');
    expect(JSON.parse(init.body as string)).toEqual({ p_timezone: 'America/Boise' });
  });

  it('keeps the reviewed relationship parameters while binding partner commands to their initiating account', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce(sessionResult('A')).mockResolvedValue(sessionResult('B'));
    await callIdentityCommand('A', 'accept_partner_link_code', {
      p_expected_relationship_id: 'reviewed-period', p_expected_relationship_session_id: '00000000-0000-4000-8000-000000000090', p_code: 'fixture-code', p_mode: 'continue', p_previous_relationship_id: 'archived-period',
    });
    const init = mocks.network.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer fixture-access-A');
    expect(JSON.parse(init.body as string)).toEqual({ p_expected_relationship_id: 'reviewed-period', p_expected_relationship_session_id: '00000000-0000-4000-8000-000000000090', p_code: 'fixture-code', p_mode: 'continue', p_previous_relationship_id: 'archived-period' });
  });

  it('uses the checked token for identity reads and still validates the returned account', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce(sessionResult('A')).mockResolvedValue(sessionResult('B'));
    mocks.network.mockResolvedValue(response({ status: 'ready_solo', user_id: 'A', role: 'dom', linked_partner_id: null,
      partner_role: null, sub_user_id: null, dom_user_id: 'A', relationship_id: 'period-A', relationship_status: 'active', relationship_session_id: '00000000-0000-4000-8000-000000000090',
      participant_id: 'member-A', permissions: {}, lifecycle_ready: false, timezone: 'UTC', partner_link_code: null }));
    expect(await fetchIdentity('A')).toMatchObject({ currentUserId: 'A', domUserId: 'A', timezone: 'UTC' });
    const init = mocks.network.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer fixture-access-A');
  });

  it('binds link preview to the expected account rather than whichever session SDK fetch sees later', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce(sessionResult('A')).mockResolvedValue(sessionResult('B'));
    mocks.network.mockResolvedValue(response({ mode: 'fresh', previous_relationship_id: null, can_continue_previous: false }));
    expect(await fetchLinkPreview('A', ' code ')).toEqual({ mode: 'fresh', previousRelationshipId: null, canContinuePrevious: false });
    const init = mocks.network.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer fixture-access-A');
    expect(JSON.parse(init.body as string)).toEqual({ p_code: 'CODE' });
  });

  it('does not send a read aborted while the session check is pending', async () => {
    const pending = deferred<ReturnType<typeof sessionResult>>();
    vi.spyOn(supabase.auth, 'getSession').mockReturnValueOnce(pending.promise);
    const controller = new AbortController();
    const read = fetchIdentity('A', controller.signal);
    controller.abort(); pending.resolve(sessionResult('A'));
    await expect(read).rejects.toMatchObject({ name: 'AbortError' });
    expect(mocks.network).not.toHaveBeenCalled();
  });

  it('rejects signed-out writes before sending a request', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: null }, error: null });
    await expect(callIdentityCommand('A', 'set_my_timezone', { p_timezone: 'UTC' })).rejects.toThrow('AUTH_REQUIRED');
    expect(mocks.network).not.toHaveBeenCalled();
  });
});
