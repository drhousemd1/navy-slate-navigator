import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://roles.invalid', supabase: {} }));
import { useRoleTransitions } from '@/contexts/auth/useRoleTransitions';
import { RoleTransitionError } from '@/data/roleTransitions/api';
import { MemoryRoleStore, rid, roleDeferred, roleIdentity, roleIntent, roleOptions, roleReceipt, roleRecord, roleScope } from './role-transition.helpers';
import type { RoleIntent, RoleReceipt } from '@/data/roleTransitions/types';
let store: MemoryRoleStore;
const transport = { options: vi.fn(), change: vi.fn(), result: vi.fn() }; const refresh = vi.fn();
beforeEach(() => { store = new MemoryRoleStore(); transport.options.mockReset().mockImplementation(async (_scope, target) => roleOptions(target));
  transport.change.mockReset().mockImplementation(async intent => roleReceipt(intent)); transport.result.mockReset().mockResolvedValue(null);
  refresh.mockReset().mockResolvedValue(roleIdentity({ currentRole: 'sub', relationshipId: rid(5), relationshipSessionId: rid(8) })); });
afterEach(cleanup);
function setup() { const deps = { store, transport }; return renderHook(({ identity }) => useRoleTransitions(identity.currentUserId, identity, refresh, deps), { initialProps: { identity: roleIdentity() } }); }
async function review(view: ReturnType<typeof setup>) { await waitFor(() => expect(view.result.current.storageReady).toBe(true)); await act(async () => { await view.result.current.loadOptions('sub'); }); }
describe('Auth-owned durable role changes', () => {
  it('only reads during review, saves before sending, and confirms against the actual current period/session', async () => {
    const view = setup(); await review(view); expect(transport.change).not.toHaveBeenCalled();
    transport.change.mockImplementation(async (intent: RoleIntent) => { expect((await store.read(roleScope.backendId, roleScope.accountId))?.intent).toEqual(intent); return roleReceipt(intent); });
    await act(async () => { await view.result.current.confirm('resume', rid(5)); });
    expect(view.result.current.record?.status).toBe('completed'); expect(view.result.current.receiptIsCurrent).toBe(false);
    view.rerender({ identity: roleIdentity({ currentRole: 'sub', relationshipId: rid(5), relationshipSessionId: rid(8) }) });
    expect(view.result.current.receiptIsCurrent).toBe(true); expect(refresh).toHaveBeenCalledTimes(1);
  });
  it('does not send when durable storage fails, and requires storage recovery before new choices', async () => {
    const view = setup(); await review(view); store.failSave = true;
    await act(async () => { await view.result.current.confirm('fresh', null); });
    expect(transport.change).not.toHaveBeenCalled(); expect(view.result.current.storageReady).toBe(false);
    await act(async () => { await view.result.current.loadOptions('dom'); }); expect(transport.options).toHaveBeenCalledTimes(1);
  });
  it('recovers a lost success response after unmount/reload without sending the command again', async () => {
    let committed: RoleReceipt | null = null;
    transport.change.mockImplementation(async intent => { committed = roleReceipt(intent); throw new RoleTransitionError('ROLE_TIMEOUT'); });
    const view = setup(); await review(view); await act(async () => { await view.result.current.confirm('fresh', null); });
    const intent = view.result.current.record!.intent; expect(view.result.current.record?.status).toBe('pending'); view.unmount();
    transport.result.mockImplementation(async recovered => { expect(recovered).toEqual(intent); return committed; });
    const recovered = setup(); await waitFor(() => expect(recovered.result.current.record?.status).toBe('completed'));
    expect(transport.change).toHaveBeenCalledTimes(1); expect(transport.result).toHaveBeenCalledTimes(1);
  });
  it('retries exactly the saved ID, tokens and context, and makes a changed connection receipt-only', async () => {
    transport.change.mockRejectedValueOnce(new RoleTransitionError('ROLE_TIMEOUT'));
    const view = setup(); await review(view); await act(async () => { await view.result.current.confirm('resume', rid(5)); });
    const intent = view.result.current.record!.intent;
    await act(async () => { await view.result.current.retry(); }); expect(transport.change.mock.calls.map(args => args[0])).toEqual([intent, intent]);
    await store.save(roleRecord(), intent.commandId); view.unmount(); const old = setup();
    await waitFor(() => expect(old.result.current.record?.status).toBe('pending')); old.rerender({ identity: roleIdentity({ relationshipSessionId: rid(90) }) });
    expect(old.result.current.canRetry).toBe(false); await act(async () => { await old.result.current.retry(); }); expect(transport.change).toHaveBeenCalledTimes(2);
  });
  it('requires a new review after a definitive rejection and does not automatically replay', async () => {
    transport.change.mockRejectedValue(new RoleTransitionError('ROLE_REVIEW_CHANGED'));
    const view = setup(); await review(view); await act(async () => { await view.result.current.confirm('resume', rid(5)); });
    expect(view.result.current.record?.status).toBe('rejected'); expect(view.result.current.options).toBeNull();
    await act(async () => { await view.result.current.retry(); }); expect(transport.change).toHaveBeenCalledTimes(1);
    await act(async () => { await view.result.current.dismiss(); }); expect(view.result.current.record).toBeNull(); expect(refresh).toHaveBeenCalledTimes(1);
    expect(transport.options).toHaveBeenCalledTimes(1);
  });
  it('keeps a malformed receipt uncertain and never refreshes or claims success', async () => {
    transport.change.mockResolvedValue({ ...roleReceipt(), accountId: rid(99) });
    const view = setup(); await review(view); await act(async () => { await view.result.current.confirm('resume', rid(5)); });
    expect(view.result.current.record?.status).toBe('pending'); expect(refresh).not.toHaveBeenCalled(); expect(view.result.current.error).toBeTruthy();
  });
  it('does not revive options after session ABA or accept late data for a new account', async () => {
    const delayed = roleDeferred<ReturnType<typeof roleOptions>>(); transport.options.mockReturnValue(delayed.promise);
    const view = setup(); await waitFor(() => expect(view.result.current.storageReady).toBe(true));
    act(() => { void view.result.current.loadOptions('sub'); });
    view.rerender({ identity: roleIdentity({ relationshipSessionId: rid(99) }) }); view.rerender({ identity: roleIdentity() });
    await act(async () => delayed.resolve(roleOptions())); expect(view.result.current.options).toBeNull();
    view.rerender({ identity: roleIdentity({ currentUserId: rid(90) }) }); expect(view.result.current.record).toBeNull();
  });
  it('ignores a late command response across account ABA and preserves its original pending record for receipt recovery', async () => {
    const delayed = roleDeferred<RoleReceipt>(); transport.change.mockReturnValue(delayed.promise);
    const view = setup(); await review(view); let changing!: Promise<void>;
    act(() => { changing = view.result.current.confirm('resume', rid(5)); }); await waitFor(() => expect(transport.change).toHaveBeenCalledTimes(1));
    const intent = transport.change.mock.calls[0][0];
    view.rerender({ identity: roleIdentity({ currentUserId: rid(99) }) }); view.rerender({ identity: roleIdentity() });
    await act(async () => { delayed.resolve(roleReceipt(intent)); await changing; });
    await waitFor(() => expect(transport.result).toHaveBeenCalled()); expect(refresh).not.toHaveBeenCalled();
    expect((await store.read(roleScope.backendId, roleScope.accountId))?.status).toBe('pending');
  });
  it('rejects same-role Fresh while allowing explicitly selected saved same-role progress', async () => {
    const view = setup(); await waitFor(() => expect(view.result.current.storageReady).toBe(true));
    await act(async () => { await view.result.current.loadOptions('dom'); await view.result.current.confirm('fresh', null); });
    expect(transport.change).not.toHaveBeenCalled(); await act(async () => { await view.result.current.confirm('resume', rid(5)); });
    expect(transport.change.mock.calls[0][0]).toMatchObject({ role: 'dom', mode: 'resume', savedPeriodId: rid(5) });
  });
});
