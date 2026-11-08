vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: mocks.theme }) }));
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Profile from '@/pages/Profile';

const mocks = vi.hoisted(() => ({ theme: 'default', deleteAccount: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => ({
  user: { id: 'account', email: 'local@example.invalid' },
  getNickname: () => 'Local test', getProfileImage: () => null,
  relationshipIdentity: { currentRole: 'sub', status: 'unlinked' }, accountDeletion: { start: mocks.deleteAccount, canStart: true },
}) }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: React.PropsWithChildren) => <div>{children}</div> }));
vi.mock('@/components/profile/PartnerLinkingSection', () => ({ default: () => null }));
vi.mock('@/components/profile/TimezoneSection', () => ({ default: () => null }));
vi.mock('@/lib/toastManager', () => ({ toastManager: { success: mocks.success, error: mocks.error } }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), error: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.theme = 'default'; });

async function confirmDeletion() {
  render(<MemoryRouter><Profile /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete Account' }));
  await waitFor(() => expect(mocks.deleteAccount).toHaveBeenCalledOnce());
}

describe('account deletion results on the real Profile page', () => {
  it.each(['light-turquoise', 'default'])('preserves original Profile labels/dialogs in %s without recoloring fixed controls', theme => {
    mocks.theme = theme;
    render(<MemoryRouter><Profile /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Profile Settings' }).parentElement!.className).toContain('text-white');
    expect(document.querySelector('label[for="nickname"]')!.className).toContain('text-gray-300');
    expect(screen.getByText('local@example.invalid').className).toContain('text-gray-400');
    expect(screen.getByText('Current Role').className).toContain('text-gray-300');
    expect(screen.getByRole('button', { name: 'Save Nickname' }).className).toContain('bg-gray-600 text-white');
    expect(document.querySelector('label[for="profileImageInput"] svg')!.getAttribute('class')).toContain('text-white');
    fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByRole('heading', { name: 'Delete Account' }).className).toContain('text-white');
    expect(within(dialog).getByText(/Delete your account and private account data permanently/).className).toContain('text-gray-300');
    expect(within(dialog).getByRole('button', { name: 'Delete Account' }).className).toContain('bg-red-600 text-white');
    expect(within(dialog).getByRole('button', { name: 'Cancel' }).className).toContain('text-white');
  });
  it('keeps a returned backend rejection visible and never announces deletion success', async () => {
    mocks.deleteAccount.mockResolvedValue({ error: 'Recovery information could not be saved. No deletion request was sent.' });
    await confirmDeletion();
    expect((await screen.findByRole('alert')).textContent).toContain('No deletion request was sent.');
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled(); // Deletion does not emit a second popup.
  });

  it('does not add a second or scheduled-deletion confirmation to a successful service result', async () => {
    mocks.deleteAccount.mockResolvedValue({ error: null });
    await confirmDeletion();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it('explains survivor retention before destructive confirmation', () => {
    render(<MemoryRouter><Profile /></MemoryRouter>); fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));
    const dialog = screen.getByRole('alertdialog'); expect(dialog.textContent).toContain('Shared messages, photos and recorded history may remain');
    expect(dialog.textContent).toContain('Text you wrote is not automatically anonymized'); expect(dialog.textContent).not.toContain('all your data');
  });
});
