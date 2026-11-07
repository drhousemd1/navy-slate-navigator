import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ account: 'A', signOut: vi.fn(), debug: vi.fn() }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => ({ user: { id: f.account, email: `${f.account}@local.invalid` }, signOut: f.signOut,
  getNickname: () => f.account, getProfileImage: () => null, getUserRoleSync: () => 'sub', relationshipIdentity: { currentRole: 'sub', status: 'unlinked' } }) }));
vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: 'navy' }) }));
vi.mock('@/features/admin-documents/useAdminDocumentAccess', () => ({ useAdminDocumentAccess: () => ({ hasAccess: false }) }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('@/components/profile/PartnerLinkingSection', () => ({ default: () => null }));
vi.mock('@/components/profile/TimezoneSection', () => ({ default: () => null }));
vi.mock('@/components/profile/RoleSelectionSection', () => ({ RoleSelectionSection: () => null }));
vi.mock('@/lib/logger', () => ({ logger: { debug: f.debug, error: vi.fn() } }));
import AccountSheet from '@/components/AccountSheet';
import Profile from '@/pages/Profile';
function Location() { return <p data-testid="location">{useLocation().pathname}</p>; }
const tree = (child: React.ReactNode) => <MemoryRouter initialEntries={['/tasks']}>{child}<Location /></MemoryRouter>;
beforeEach(() => { vi.clearAllMocks(); f.account = 'A'; });
afterEach(cleanup);
describe('actual logout entrypoints', () => {
  it('closes the originating menu immediately but never redirects or closes a replacement menu after a delayed logout', async () => {
    let finish!: () => void; f.signOut.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    const view = render(tree(<AccountSheet />));
    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
    fireEvent.click(screen.getByRole('button', { name: /Log out|Sign out/i }));
    expect(screen.queryByRole('dialog')).toBeNull(); expect(f.signOut).toHaveBeenCalledOnce();
    f.account = 'B'; view.rerender(tree(<AccountSheet />));
    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
    await act(async () => finish());
    expect(screen.getByRole('dialog')).toBeTruthy(); expect(screen.getByTestId('location').textContent).toBe('/tasks');
    expect(f.debug.mock.calls.flat().join(' ')).not.toContain('signed out');
  });
  it('leaves Profile navigation and success reporting to the actual auth result', async () => {
    let finish!: () => void; f.signOut.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    const view = render(tree(<Profile />)); fireEvent.click(screen.getByRole('button', { name: 'Log Out' }));
    f.account = 'B'; view.rerender(tree(<Profile />)); await act(async () => finish());
    expect(screen.getByText('B@local.invalid')).toBeTruthy(); expect(screen.getByTestId('location').textContent).toBe('/tasks');
    expect(f.debug.mock.calls.flat().join(' ')).not.toContain('signed out');
  });
});
