import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { createSupabaseRewardTransport } from '@/data/actions/supabase-transport';
import { command, receipt, scope, uuid } from './action-queue.helpers';

const mocks = vi.hoisted(() => ({ network: vi.fn() }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const url = 'https://action-transport-fixture.invalid';
  return { supabaseBackendId: url, supabase: createClient(url, 'fixture-public-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: mocks.network },
  }) };
});
const session = (id: string) => ({ data: { session: { user: { id }, access_token: `synthetic-${id}`, token_type: 'bearer', refresh_token: 'unused', expires_in: 3600 } as Session }, error: null });
beforeEach(() => { mocks.network.mockReset(); mocks.network.mockResolvedValue(new Response(JSON.stringify(receipt()), { status: 200, headers: { 'Content-Type': 'application/json' } })); });

describe('real SDK reward adapter (network stubbed)', () => {
  it('uses the configured backend and pins actor A even if the SDK reads session B before fetch', async () => {
    const getSession = vi.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce(session(scope.accountId)).mockResolvedValue(session(uuid(99)));
    const transport = createSupabaseRewardTransport();
    const result = await transport.execute(command, { ...scope, backendId: transport.backendId }, new AbortController().signal);
    expect(result.kind).toBe('confirmed'); expect(getSession).toHaveBeenCalledTimes(2);
    const [url, init] = mocks.network.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://action-transport-fixture.invalid/rest/v1/rpc/execute_reward_command');
    expect(new Headers(init.headers).get('Authorization')).toBe(`Bearer synthetic-${scope.accountId}`);
    expect(JSON.parse(init.body as string)).toMatchObject({ p_command_id: command.commandId, p_expected_relationship_id: scope.relationshipId, p_action: 'reward_buy' });
  });
  it('does not call RPC when the current account does not match the captured command account', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue(session(uuid(99)));
    const transport = createSupabaseRewardTransport();
    expect((await transport.execute(command, { ...scope, backendId: transport.backendId }, new AbortController().signal)).kind).toBe('not_sent');
    expect(mocks.network).not.toHaveBeenCalled();
  });
});
