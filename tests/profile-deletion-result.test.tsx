import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Profile from '@/pages/Profile';

const mocks = vi.hoisted(() => ({ deleteAccount: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => ({
  user: { id: 'account', email: 'local@example.invalid' },
  getNickname: () => 'Local test', getProfileImage: () => null,
  relationshipIdentity: { currentRole: 'sub', status: 'unlinked' }, deleteAccount: mocks.deleteAccount,
}) }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: React.PropsWithChildren) => <div>{children}</div> }));
vi.mock('@/components/profile/PartnerLinkingSection', () => ({ default: () => null }));
vi.mock('@/components/profile/TimezoneSection', () => ({ default: () => null }));
vi.mock('@/lib/toastManager', () => ({ toastManager: { success: mocks.success, error: mocks.error } }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), error: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); });

async function confirmDeletion() {
  render(<MemoryRouter><Profile /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete Account' }));
  await waitFor(() => expect(mocks.deleteAccount).toHaveBeenCalledOnce());
}

describe('account deletion results on the real Profile page', () => {
  it('keeps a returned backend rejection visible and never announces deletion success', async () => {
    mocks.deleteAccount.mockResolvedValue({ error: { message: 'Deletion is unavailable while history is upgraded.', code: '42501', details: '', hint: null } });
    await confirmDeletion();
    expect((await screen.findByRole('alert')).textContent).toContain('Deletion is unavailable while history is upgraded.');
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled(); // The account service owns its returned-error popup.
  });

  it('does not add a second or scheduled-deletion confirmation to a successful service result', async () => {
    mocks.deleteAccount.mockResolvedValue({ error: null });
    await confirmDeletion();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(mocks.success).not.toHaveBeenCalled();
  });
});
