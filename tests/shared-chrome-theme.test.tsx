import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ theme: 'default', authenticated: true, signOut: vi.fn() }));
vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: mocks.theme }) }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => ({
  user: mocks.authenticated ? { id: 'self', email: 'self@example.test' } : null,
  getNickname: () => 'My nickname', getProfileImage: () => null, getUserRoleSync: () => 'Dom',
  signOut: mocks.signOut, isAdmin: true,
}) }));
vi.mock('@/hooks/useUnreadMessages', () => ({ useUnreadMessages: () => ({ unreadCount: 0, error: null }) }));
vi.mock('@/hooks/usePartnerProfile', () => ({ usePartnerProfile: () => ({ data: { id: 'partner', nickname: 'Partner nickname', role: 'Sub', avatar_url: null } }) }));
vi.mock('@/data/wellbeing/queries', () => ({ useWellbeingQuery: () => ({ data: { overallScore: 80 }, isLoading: false, error: null }) }));
vi.mock('@/components/header/UserHealthBar', () => ({ default: () => null }));
vi.mock('@/components/wellbeing/MoodHealthBar', () => ({ default: () => null }));
vi.mock('@/components/wellbeing/WellbeingPopover', () => ({ default: ({ children }: React.PropsWithChildren) => children }));
vi.mock('@/components/AvatarPreviewPopover', () => ({ default: ({ children }: React.PropsWithChildren) => children }));
vi.mock('@/features/admin-documents/useAdminDocumentAccess', () => ({ useAdminDocumentAccess: () => 'allowed' }));
vi.mock('@/data/branding/queries', () => ({ useBrandingAccess: () => 'denied' }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), error: vi.fn() } }));

import AppLayout from '@/components/AppLayout';
import { getColorScheme } from '@/lib/colorSchemes';

function CurrentPage() {
  const location = useLocation();
  return <AppLayout><p data-testid="path">{location.pathname}</p><p style={{ color: '#fefefe' }}>User-selected card text</p></AppLayout>;
}
function mount(path = '/tasks') { return render(<MemoryRouter initialEntries={[path]}><CurrentPage /></MemoryRouter>); }
beforeEach(() => { mocks.theme = 'default'; mocks.authenticated = true; mocks.signOut.mockResolvedValue(undefined); });
afterEach(cleanup);

describe('real shared application chrome', () => {
  it('preserves original header and menu presentation in the light palette and keeps route actions', () => {
    mocks.theme = 'light-turquoise'; mount();
    expect(screen.getByText('My nickname').className).toContain('text-white');
    expect(screen.getByText('Partner nickname').className).toContain('text-white');
    expect(screen.getByText('Dom').className).toContain('text-gray-400');
    expect(screen.getByText('Sub').className).toContain('text-gray-400');
    const trigger = screen.getByRole('button', { name: 'Open account menu' });
    expect(trigger.querySelector('svg')?.getAttribute('class')).toContain('text-gray-300');
    fireEvent.click(trigger);
    const menu = screen.getByRole('dialog');
    expect(menu.className).toContain('bg-navy');
    expect(menu.className).toContain('text-white');
    expect(within(menu).getByRole('heading', { name: 'Account' }).className).toContain('text-white');
    const encyclopedia = within(menu).getByRole('button', { name: 'Encyclopedia' });
    expect(encyclopedia.className).toContain('text-white');
    expect(encyclopedia.className).toContain('hover:text-cyan-300');
    expect(within(menu).getByRole('button', { name: 'Log Out' }).className).toContain('text-red-400');
    fireEvent.click(encyclopedia);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('path').textContent).toBe('/encyclopedia');
  });

  it('preserves original cyan neon navigation in light mode and responds to route changes', () => {
    mocks.theme = 'light-turquoise'; mount();
    const tasks = screen.getByRole('link', { name: 'Tasks' });
    expect(tasks.getAttribute('aria-current')).toBe('page');
    expect(tasks.className).toContain('text-[#00FFF7]');
    expect(within(tasks).getByText('Tasks').className).toContain('neon-text');
    expect(tasks.querySelector('.neon-icon')).not.toBeNull();
    const rules = screen.getByRole('link', { name: 'Rules' });
    expect(rules.className).toContain('text-nav-inactive');
    expect(rules.querySelector('.underline')).toBeNull();
    fireEvent.click(rules);
    expect(screen.getByTestId('path').textContent).toBe('/rules');
    expect(rules.getAttribute('aria-current')).toBe('page');
    expect(tasks.getAttribute('aria-current')).toBeNull();
    expect(document.querySelectorAll('a[aria-current="page"]')).toHaveLength(1);
  });

  it('retains navy neon selection and leaves fixed button/user-authored colors alone', () => {
    mount();
    const tasks = screen.getByRole('link', { name: 'Tasks' });
    expect(tasks.className).toContain('text-[#00FFF7]');
    expect(tasks.querySelector('.neon-icon')).not.toBeNull();
    expect(tasks.querySelector('.neon-text')).not.toBeNull();
    expect(document.querySelector('svg.lucide-plus')?.getAttribute('class')).toContain('text-white');
    expect(screen.getByText('User-selected card text').style.color).toBe('rgb(254, 254, 254)');
    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
    expect(screen.getByRole('button', { name: 'Log Out' }).className).toContain('text-red-400');
    expect(screen.getByRole('button', { name: 'Home' }).className).toContain('hover:text-cyan-300');
  });

  it('preserves the original signed-out menu and its login route', () => {
    mocks.theme = 'light-turquoise'; mocks.authenticated = false; mount('/');
    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
    const login = screen.getByRole('button', { name: 'Log In / Sign Up' });
    expect(login.className).toContain('text-cyan-400');
    fireEvent.click(login);
    expect(screen.getByTestId('path').textContent).toBe('/auth');
  });

  it('retains the original light palette values instead of imposing a replacement palette', () => {
    const v = getColorScheme('light-turquoise')!.variables;
    expect(v['--primary-foreground']).toBe('0 0% 100%');
    expect(v['--foreground']).toBe('210 40% 21%');
    expect(getColorScheme('default')!.variables['--primary-foreground']).toBe('222.2 47.4% 11.2%');
  });
});
