import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://roles.invalid', supabase: {} }));
import { createRoleTransport, RoleTransitionError } from '@/data/roleTransitions/api';
import { decodeRoleOptions, decodeRoleReceipt, decodeRoleResult } from '@/data/roleTransitions/types';
import { checkedRoleRecord, createRoleStore } from '@/data/roleTransitions/store';
import { rid, roleDeferred, roleIntent, roleOptions, roleReceipt, roleRecord, roleScope } from './role-transition.helpers';
afterEach(() => vi.useRealTimers());
function setup() {
  const deps = { backendId: roleScope.backendId, timeoutMs: 20, session: vi.fn().mockResolvedValue({ accountId: roleScope.accountId, token: 'captured-test-token' }),
    rpc: vi.fn().mockResolvedValue({ data: roleOptions(), error: null }) };
  return { deps, transport: createRoleTransport(deps) };
}
describe('role transition contract and bounded transport', () => {
  it('preserves signed balances, zero values, saved-use counts and the exact scoped request', async () => {
    const { deps, transport } = setup(); const options = await transport.options(roleScope, 'sub');
    expect(options.current.balance).toBe(-4); expect(options.current.availableUses).toBe(0); expect(options.saved[0]).toMatchObject({ balance: 0, availableUses: 2 });
    expect(deps.rpc).toHaveBeenCalledWith('get_my_role_change_options', { p_expected_relationship_id: roleScope.relationshipId, p_expected_relationship_session_id: roleScope.relationshipSessionId, p_role: 'sub' }, 'captured-test-token', expect.any(AbortSignal));
    deps.rpc.mockResolvedValue({ data: roleReceipt(), error: null }); await transport.change(roleIntent());
    expect(deps.rpc.mock.calls[1][1]).toEqual({ p_command_id: rid(6), p_expected_relationship_id: rid(2), p_expected_relationship_session_id: rid(3), p_role: 'sub', p_mode: 'resume', p_saved_period_id: rid(5), p_current_review_token: 'current-hash', p_destination_review_token: 'saved-hash' });
    deps.rpc.mockResolvedValue({ data: { receipt: roleReceipt() }, error: null }); expect(await transport.result(roleIntent())).toEqual(roleReceipt());
    expect(deps.rpc.mock.calls[2][1]).toEqual({ p_command_id: rid(6) });
  });
  it('rejects a changed account before sending and after receiving, with no accepted stale result', async () => {
    const { deps, transport } = setup(); deps.session.mockResolvedValueOnce({ accountId: rid(99), token: 'other' });
    await expect(transport.options(roleScope, 'sub')).rejects.toThrow('ACCOUNT_CHANGED'); expect(deps.rpc).not.toHaveBeenCalled();
    deps.session.mockResolvedValueOnce({ accountId: roleScope.accountId, token: 'captured' }).mockResolvedValueOnce({ accountId: rid(99), token: 'other' });
    await expect(transport.options(roleScope, 'sub')).rejects.toThrow('ACCOUNT_CHANGED'); expect(deps.rpc.mock.calls[0][2]).toBe('captured');
  });
  it('bounds the whole read including a stalled token check and sends nothing when it resolves late', async () => {
    vi.useFakeTimers(); const { deps, transport } = setup(); const delayed = roleDeferred<{ accountId: string; token: string }>(); deps.session.mockReturnValue(delayed.promise);
    const result = transport.options(roleScope, 'sub'); const assertion = expect(result).rejects.toThrow('ROLE_TIMEOUT'); await vi.advanceTimersByTimeAsync(25); await assertion;
    delayed.resolve({ accountId: roleScope.accountId, token: 'late' }); await Promise.resolve(); expect(deps.rpc).not.toHaveBeenCalled();
  });
  it('cancels requests and preserves definitive server rejection codes', async () => {
    const { deps, transport } = setup(); const controller = new AbortController(); controller.abort();
    await expect(transport.options(roleScope, 'sub', controller.signal)).rejects.toMatchObject({ name: 'AbortError' }); expect(deps.rpc).not.toHaveBeenCalled();
    deps.rpc.mockResolvedValue({ data: null, error: { message: 'ROLE_REVIEW_CHANGED' } });
    await expect(transport.change(roleIntent())).rejects.toBeInstanceOf(RoleTransitionError);
  });
  it('rejects malformed and mismatched options or receipts rather than accepting a partial success', () => {
    for (const patch of [{ accountId: rid(99) }, { commandId: rid(99) }, { from: { periodId: rid(99), sessionId: rid(3) } },
      { to: { periodId: rid(7), sessionId: rid(8), role: 'sub' } }, { to: { periodId: rid(5), sessionId: rid(3), role: 'sub' } }, { to: { periodId: rid(5), sessionId: rid(8), role: 'dom' } }]) {
      expect(() => decodeRoleReceipt({ ...roleReceipt(), ...patch }, roleIntent())).toThrow();
    }
    expect(() => decodeRoleResult({}, roleIntent())).toThrow(); expect(decodeRoleResult({ receipt: null }, roleIntent())).toBeNull();
    expect(() => decodeRoleOptions({ ...roleOptions(), current: { ...roleOptions().current, availableUses: -1 } }, roleScope, 'sub')).toThrow();
    expect(() => decodeRoleOptions({ ...roleOptions(), saved: [roleOptions().saved[0], roleOptions().saved[0]] }, roleScope, 'sub')).toThrow();
    expect(() => decodeRoleOptions(roleOptions(), { ...roleScope, relationshipSessionId: rid(99) }, 'sub')).toThrow();
  });
  it('validates durable record ownership and receipt consistency, and fails safely without IndexedDB', async () => {
    expect(checkedRoleRecord(roleRecord(), roleScope.backendId, roleScope.accountId)).toEqual(roleRecord());
    expect(() => checkedRoleRecord(roleRecord(), roleScope.backendId, rid(99))).toThrow();
    expect(() => checkedRoleRecord({ ...roleRecord(), status: 'completed' }, roleScope.backendId, roleScope.accountId)).toThrow();
    await expect(createRoleStore({ open: () => { throw new Error('blocked'); } } as unknown as IDBFactory).save(roleRecord(), null)).rejects.toThrow('ROLE_STORAGE_UNAVAILABLE');
  });
});
