import React from 'react';
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { useUserProfile } from '@/contexts/auth/useUserProfile';
import Profile from '@/pages/Profile';
import { resolveIdentity } from '@/lib/identity';

const mocks = vi.hoisted(() => ({ toast: vi.fn(), otherPopup: vi.fn(), command: vi.fn(), auth: {} as Record<string, unknown> }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/lib/toastManager', () => ({ toastManager: { error: mocks.otherPopup, success: vi.fn() } }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/data/identity', () => ({ callIdentityCommand: mocks.command, identityCommandError: () => 'Disconnect your current partner before changing your role.' }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), debug: vi.fn() } }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/utils/image/avatarIntegration', () => ({ handleAvatarImageUpload: vi.fn() }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('@/components/profile/PartnerLinkingSection', () => ({ default: () => null }));
vi.mock('@/components/profile/DeleteAccountDialog', () => ({ DeleteAccountDialog: () => null }));
vi.mock('@/components/profile/DeleteAvatarDialog', () => ({ DeleteAvatarDialog: () => null }));
afterEach(cleanup);

it('propagates a failed role change to the actual Profile page with one popup and a persistent inline error', async () => {
  const user = { id: 'A', email: 'fixture@example.invalid', user_metadata: {} } as User;
  const identity = resolveIdentity('A', { id: 'A', role: 'dom', linked_partner_id: null });
  mocks.command.mockRejectedValueOnce(new Error('UNLINK_BEFORE_ROLE_CHANGE'));
  const { result } = renderHook(() => useUserProfile(user, vi.fn(), { getRole: () => 'dom', refresh: vi.fn() }));
  mocks.auth = { user, ...result.current, relationshipIdentity: identity };
  render(<MemoryRouter><Profile /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Set as Submissive' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Disconnect your current partner before changing your role.'));
  expect(mocks.toast).toHaveBeenCalledTimes(1);
  expect(mocks.otherPopup).not.toHaveBeenCalled();
  expect(mocks.command).toHaveBeenCalledWith('A', 'set_my_profile_role', { p_role: 'sub' });
  expect(screen.getByText('dom')).toBeTruthy();
});
