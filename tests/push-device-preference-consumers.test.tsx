import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ update: vi.fn(), toggle: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: React.PropsWithChildren) => children }));
vi.mock('@/components/profile/PushDeviceSettings', () => ({ PushDeviceSettings: () => <p>Separate device controls</p> }));
vi.mock('@/components/profile/WellnessReminderSettings', () => ({ default: () => <p>Separate personal schedule</p> }));
vi.mock('@/hooks/useNotificationSettings', () => ({ useNotificationSettings: () => ({
  preferences: { enabled: true, types: { wellnessCheckin: false, messages: true } },
  isReady: true, isLoading: false, isSaving: false, loadError: null,
  updateNotificationType: mocks.update, toggleNotifications: mocks.toggle,
}) }));
import { NotificationSettings } from '@/components/profile/NotificationSettings';
import Notifications from '@/pages/Notifications';

beforeEach(() => { mocks.update.mockReset().mockResolvedValue(undefined); mocks.toggle.mockReset().mockResolvedValue(undefined); });
afterEach(cleanup);
describe.each([['profile', NotificationSettings], ['notification page', Notifications]] as const)('%s delivery preferences', (_name, Component) => {
  it('makes an existing disabled wellness delivery preference reachable without registering a device or changing its schedule', () => {
    render(<Component />);
    const toggle = screen.getByRole('switch', { name: 'Wellness Check-in' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(toggle);
    expect(mocks.update).toHaveBeenCalledWith('wellnessCheckin', true);
    expect(mocks.toggle).not.toHaveBeenCalled();
    expect(screen.getByText('Allow push delivery for your saved personal reminder schedule')).toBeTruthy();
  });
});
