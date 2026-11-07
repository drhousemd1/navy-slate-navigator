import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import type { IdentityState } from '@/lib/identity';
import type { AuthContextType } from '@/contexts/AuthContext';
import { useRoleTransitions } from '@/contexts/auth/useRoleTransitions';
import Profile from '@/pages/Profile';
import { RoleTransitionError } from '@/data/roleTransitions/api';
import { MemoryRoleStore, rid, roleDeferred, roleIdentity, roleOptions, roleReceipt, roleScope } from './role-transition.helpers';
import type { RoleReceipt } from '@/data/roleTransitions/types';
const mocks = vi.hoisted(() => ({ auth: {} as AuthContextType, popup: vi.fn() }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://roles.invalid', supabase: {} }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: PropsWithChildren) => <>{children}</> }));
vi.mock('@/components/profile/PartnerLinkingSection', () => ({ default: () => null }));
vi.mock('@/components/profile/TimezoneSection', () => ({ default: () => null }));
vi.mock('@/components/profile/DeleteAccountDialog', () => ({ DeleteAccountDialog: () => null }));
vi.mock('@/components/profile/DeleteAvatarDialog', () => ({ DeleteAvatarDialog: () => null }));
vi.mock('@/lib/toastManager', () => ({ toastManager: { error: mocks.popup, success: mocks.popup } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), debug: vi.fn() } }));
let deps: { store: MemoryRoleStore; transport: { options: ReturnType<typeof vi.fn>; change: ReturnType<typeof vi.fn>; result: ReturnType<typeof vi.fn> } };
const refresh = vi.fn();
beforeEach(() => { deps = { store: new MemoryRoleStore(), transport: { options: vi.fn().mockImplementation(async (_scope, target) => roleOptions(target)),
  change: vi.fn().mockImplementation(async intent => roleReceipt(intent)), result: vi.fn().mockResolvedValue(null) } }; refresh.mockReset().mockResolvedValue(roleIdentity()); mocks.popup.mockClear(); });
afterEach(cleanup);
const nickname = () => 'Test account'; const image = () => '';
function Host({ identity = roleIdentity(), visible = true }: { identity?: IdentityState; visible?: boolean }) {
  const transitions = useRoleTransitions(identity.currentUserId, identity, refresh, deps);
  mocks.auth = { user: { id: identity.currentUserId!, user_metadata: {} }, relationshipIdentity: identity, roleTransitions: transitions,
    getNickname: nickname, getProfileImage: image } as AuthContextType;
  return <MemoryRouter>{visible && <Profile />}</MemoryRouter>;
}
async function open() { const button = screen.getByRole('button', { name: 'Set as Submissive' }); await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false)); await userEvent.setup().click(button); await screen.findByText(/Current Dom progress: -4 points/); }
describe('actual Profile role chooser', () => {
  it('opens a read-only review, shows signed and zero values, and requires an explicit mode and period before confirmation', async () => {
    render(<Host />); await open();
    expect(screen.getByText('Current Dom progress: -4 points · 0 unused reward uses.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Confirm role change' }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.setup().selectOptions(screen.getByLabelText('Sub progress choice'), 'resume');
    expect((screen.getByRole('button', { name: 'Confirm resume' }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.setup().selectOptions(screen.getByLabelText('Saved Sub period'), rid(5));
    expect(screen.getByText('Selected Sub progress: 0 points · 2 unused reward uses. Its saved history and definitions will become current.')).toBeTruthy();
    expect(deps.transport.change).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Confirm resume' }));
    await waitFor(() => expect(deps.transport.change).toHaveBeenCalledTimes(1)); expect(deps.transport.change.mock.calls[0][0]).toMatchObject({ mode: 'resume', savedPeriodId: rid(5) });
    expect(mocks.popup).not.toHaveBeenCalled();
  });
  it('describes an empty Fresh destination without converting values, and cancellation sends nothing', async () => {
    render(<Host />); await open(); await userEvent.setup().selectOptions(screen.getByLabelText('Sub progress choice'), 'fresh');
    expect(screen.getByText('Selected Sub progress: 0 points · 0 unused reward uses. This starts a new empty period.')).toBeTruthy();
    expect(screen.getByText(/nothing is converted, refunded or moved/)).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' })); expect(screen.queryByRole('group', { name: 'Review solo role progress' })).toBeNull();
    expect(deps.transport.change).not.toHaveBeenCalled();
  });
  it('offers explicitly saved current-role periods without offering a same-role Fresh reset', async () => {
    render(<Host />); const button = screen.getByRole('button', { name: 'Saved solo progress' });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false)); await userEvent.setup().click(button);
    await screen.findByLabelText('Dom progress choice'); expect(screen.queryByRole('option', { name: 'Start this role fresh' })).toBeNull();
    await userEvent.setup().selectOptions(screen.getByLabelText('Dom progress choice'), 'resume');
    await userEvent.setup().selectOptions(screen.getByLabelText('Saved Dom period'), rid(5));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Confirm resume' }));
    await waitFor(() => expect(deps.transport.change.mock.calls[0][0]).toMatchObject({ role: 'dom', mode: 'resume' }));
  });
  it('keeps linked role changes locked and does not load role destinations', async () => {
    render(<Host identity={roleIdentity({ status: 'linked', partnerUserId: rid(99) })} />);
    await waitFor(() => expect(screen.queryByText('Loading saved role changes…')).toBeNull());
    expect((screen.getByRole('button', { name: 'Set as Submissive' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Disconnect your partner before changing your Dom or Sub role.')).toBeTruthy();
    expect(deps.transport.options).not.toHaveBeenCalled();
  });
  it('keeps preview rejection visible on Profile and requires fresh review instead of replaying or claiming success', async () => {
    deps.transport.change.mockRejectedValue(new RoleTransitionError('ROLE_REVIEW_CHANGED'));
    render(<Host />); await open(); await userEvent.setup().selectOptions(screen.getByLabelText('Sub progress choice'), 'fresh');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Confirm role change' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Review the current choices again');
    expect(screen.getByText('This request was not applied. Review current choices before trying again.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry same role change' })).toBeNull(); expect(screen.getByText('dom')).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Review choices again' }));
    expect(deps.transport.change).toHaveBeenCalledTimes(1); expect(deps.transport.options).toHaveBeenCalledTimes(1); expect(refresh).toHaveBeenCalledTimes(1);
  });
  it('preserves pending progress outside Profile across a provider-style unmount, with no early success claim', async () => {
    const pending = roleDeferred<RoleReceipt>(); deps.transport.change.mockReturnValue(pending.promise);
    const view = render(<Host />); await open(); await userEvent.setup().selectOptions(screen.getByLabelText('Sub progress choice'), 'fresh');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Confirm role change' }));
    await screen.findByText(/Its result is not confirmed/); view.rerender(<Host visible={false} />);
    const intent = deps.transport.change.mock.calls[0][0]; await act(async () => pending.resolve(roleReceipt(intent)));
    view.rerender(<Host identity={roleIdentity({ currentRole: 'sub', relationshipId: rid(7), relationshipSessionId: rid(8) })} />);
    expect(screen.getByText('Sub progress is now active. Your previous progress remains saved.')).toBeTruthy();
    expect((await deps.store.read(roleScope.backendId, roleScope.accountId))?.status).toBe('completed'); expect(deps.transport.change).toHaveBeenCalledTimes(1);
  });
});
