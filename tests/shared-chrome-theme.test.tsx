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
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), error: vi.fn() } }));

import AppLayout from '@/components/AppLayout';
import { getColorScheme } from '@/lib/colorSchemes';

function CurrentPage() {
  const location = useLocation();
  return <AppLayout><p data-testid="path">{location.pathname}</p><p style={{ color: '#fefefe' }}>User-selected card text</p></AppLayout>;
}
function mount(path = '/tasks') { return render(<MemoryRouter initialEntries={[path]}><CurrentPage /></MemoryRouter>); }
function luminance(hsl: string) {
  const [h, s, l] = hsl.split(' ').map(Number.parseFloat);
  const a = s / 100 * Math.min(l / 100, 1 - l / 100);
  const rgb = [0, 8, 4].map(n => {
    const k = (n + h / 30) % 12;
    const v = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

beforeEach(() => { mocks.theme = 'default'; mocks.authenticated = true; mocks.signOut.mockResolvedValue(undefined); });
afterEach(cleanup);

describe('real shared application chrome', () => {
  it('keeps light header names/roles/menu readable and preserves route actions', () => {
    mocks.theme = 'light-turquoise'; mount();
    expect(screen.getByText('My nickname').className).toContain('text-foreground');
    expect(screen.getByText('Partner nickname').className).toContain('text-foreground');
    expect(screen.getByText('Dom').className).toContain('text-foreground');
    expect(screen.getByText('Sub').className).toContain('text-foreground');
    const trigger = screen.getByRole('button', { name: 'Open account menu' });
    expect(trigger.querySelector('svg')?.getAttribute('class')).toContain('text-muted-foreground');
    fireEvent.click(trigger);
    const menu = screen.getByRole('dialog');
    expect(menu.className).toContain('bg-navy');
    expect(menu.className).toContain('text-foreground');
    expect(within(menu).getByRole('heading', { name: 'Account' }).className).toContain('text-foreground');
    const encyclopedia = within(menu).getByRole('button', { name: 'Encyclopedia' });
    expect(encyclopedia.className).toContain('text-foreground');
    expect(encyclopedia.className).toContain('hover:text-foreground');
    expect(within(menu).getByRole('button', { name: 'Log Out' }).className).toContain('text-red-700');
    fireEvent.click(encyclopedia);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('path').textContent).toBe('/encyclopedia');
  });

  it('keeps active light navigation explicit, legible, and responsive to route changes', () => {
    mocks.theme = 'light-turquoise'; mount();
    const tasks = screen.getByRole('link', { name: 'Tasks' });
    expect(tasks.getAttribute('aria-current')).toBe('page');
    expect(tasks.className).toContain('text-foreground');
    expect(within(tasks).getByText('Tasks').className).toContain('underline');
    expect(tasks.querySelector('.neon-text, .neon-icon')).toBeNull();
    const rules = screen.getByRole('link', { name: 'Rules' });
    expect(rules.className).toContain('text-foreground');
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

  it('keeps the signed-out menu legible without changing its login route', () => {
    mocks.theme = 'light-turquoise'; mocks.authenticated = false; mount('/');
    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
    const login = screen.getByRole('button', { name: 'Log In / Sign Up' });
    expect(login.className).toContain('text-foreground');
    fireEvent.click(login);
    expect(screen.getByTestId('path').textContent).toBe('/auth');
  });

  it('uses palette foreground tokens with sufficient light-surface text contrast', () => {
    const v = getColorScheme('light-turquoise')!.variables;
    expect(contrast(v['--foreground'], v['--navy'])).toBeGreaterThanOrEqual(4.5);
    // Muted is only used for non-text icons on the light header. Small labels
    // and both navigation labels use foreground; selected adds an underline.
    expect(contrast(v['--muted-foreground'], v['--navy'])).toBeGreaterThanOrEqual(3);
    expect(contrast(v['--foreground'], v['--light-navy'])).toBeGreaterThanOrEqual(4.5);
  });
});
