import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { useUserProfile } from '@/contexts/auth/useUserProfile';
import { decodeIdentity } from '@/lib/identity';
import { rid, roleDeferred } from './role-transition.helpers';

const mocks = vi.hoisted(() => ({ toast: vi.fn(), otherPopup: vi.fn(), command: vi.fn(), auth: {} as Record<string, unknown> }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/lib/toastManager', () => ({ toastManager: { error: mocks.otherPopup, success: vi.fn() } }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/data/identity', () => ({ callIdentityCommand: mocks.command, identityCommandError: (error: Error) => error.message === 'UNLINK_BEFORE_ROLE_CHANGE' ? 'Disconnect your current partner before changing your role.' : error.message }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), debug: vi.fn() } }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/utils/image/avatarIntegration', () => ({ handleAvatarImageUpload: vi.fn() }));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.command.mockReset(); });
const setupReceipt = () => ({ status: 'ready_solo', user_id: 'A', role: 'sub', linked_partner_id: null, partner_role: null,
  sub_user_id: 'A', dom_user_id: null, relationship_id: rid(2), relationship_status: 'active', relationship_session_id: rid(3), participant_id: rid(4), permissions: {}, lifecycle_ready: true, timezone: 'UTC' });
const setupUser = (id = 'A') => ({ id, email: 'fixture@example.invalid', user_metadata: {} } as User);

it('keeps initial role setup on its existing command and propagates failure with one popup', async () => {
  const user = { id: 'A', email: 'fixture@example.invalid', user_metadata: {} } as User;
  mocks.command.mockRejectedValueOnce(new Error('UNLINK_BEFORE_ROLE_CHANGE'));
  const { result } = renderHook(() => useUserProfile(user, vi.fn(), { getRole: () => 'dom', refresh: vi.fn() }));
  await act(async () => { await expect(result.current.updateUserRole('sub')).rejects.toThrow('Disconnect your current partner before changing your role.'); });
  expect(mocks.toast).toHaveBeenCalledTimes(1);
  expect(mocks.otherPopup).not.toHaveBeenCalled();
  expect(mocks.command).toHaveBeenCalledWith('A', 'set_my_profile_role', { p_role: 'sub' });
  expect(result.current.getUserRoleSync()).toBe('dom');
});

it('announces setup only after the receipt and canonical account/role/period/session agree', async () => {
  const receipt = setupReceipt(); mocks.command.mockResolvedValue(receipt);
  const refresh = vi.fn().mockResolvedValue(decodeIdentity('A', receipt));
  const view = renderHook(() => useUserProfile(setupUser(), vi.fn(), { getRole: () => null, refresh }));
  await act(async () => { await view.result.current.updateUserRole('sub'); });
  expect(mocks.toast).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ title: 'Role updated' }));
});

it.each(['currentUserId', 'currentRole', 'relationshipId', 'relationshipSessionId'] as const)('does not claim setup success after refreshed %s changes', async field => {
  const receipt = setupReceipt(); mocks.command.mockResolvedValue(receipt);
  const refresh = vi.fn().mockResolvedValue({ ...decodeIdentity('A', receipt), [field]: field === 'currentRole' ? 'dom' : rid(99) });
  const view = renderHook(() => useUserProfile(setupUser(), vi.fn(), { getRole: () => null, refresh }));
  await act(async () => { await expect(view.result.current.updateUserRole('sub')).rejects.toThrow('could not be verified'); });
  expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Role updated' }));
});

it('ignores late setup receipts after account ABA and unmount', async () => {
  const pending = roleDeferred<unknown>(); mocks.command.mockReturnValue(pending.promise); const refresh = vi.fn();
  const view = renderHook(({ id }) => useUserProfile(setupUser(id), vi.fn(), { getRole: () => null, refresh }), { initialProps: { id: 'A' } });
  let operation!: Promise<void>; act(() => { operation = view.result.current.updateUserRole('sub'); });
  view.rerender({ id: 'B' }); view.rerender({ id: 'A' });
  await act(async () => { pending.resolve(setupReceipt()); await operation; });
  expect(refresh).not.toHaveBeenCalled(); expect(mocks.toast).not.toHaveBeenCalled();
  const later = roleDeferred<unknown>(); mocks.command.mockReturnValue(later.promise);
  act(() => { operation = view.result.current.updateUserRole('sub'); }); view.unmount();
  await act(async () => { later.resolve(setupReceipt()); await operation; }); expect(refresh).not.toHaveBeenCalled(); expect(mocks.toast).not.toHaveBeenCalled();
});
