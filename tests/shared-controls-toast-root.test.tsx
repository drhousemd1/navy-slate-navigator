import React, { type PropsWithChildren } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { toast as sonnerToast } from 'sonner';
import App from '@/App';
import { AppProviders } from '@/components/app/AppProviders';
import { toast } from '@/hooks/use-toast';

// Keep the real App + AppProviders composition and toast renderer. Replace only
// unrelated providers/routes so this regression never initializes a backend.
vi.mock('@tanstack/react-query', () => ({ QueryClientProvider: ({ children }: PropsWithChildren) => children }));
vi.mock('@tanstack/react-query-devtools', () => ({ ReactQueryDevtools: () => null }));
vi.mock('@/data/queryClient', () => ({ queryClient: {} }));
vi.mock('@/contexts/AuthContext', () => ({ AuthProvider: ({ children }: PropsWithChildren) => children }));
vi.mock('@/contexts/UserIdsContext', () => ({ UserIdsProvider: ({ children }: PropsWithChildren) => children }));
vi.mock('@/contexts/ActionCommandsContext', () => ({ ActionCommandsProvider: ({ children }: PropsWithChildren) => children }));
vi.mock('@/contexts/NetworkStatusContext', () => ({ NetworkStatusProvider: ({ children }: PropsWithChildren) => children }));
vi.mock('@/contexts/RewardsContext', () => ({ RewardsProvider: ({ children }: PropsWithChildren) => children }));
vi.mock('@/contexts/punishments/PunishmentsProvider', () => ({ PunishmentsProvider: ({ children }: PropsWithChildren) => children }));
vi.mock('@/contexts/ColorSchemeContext', () => ({ ColorSchemeProvider: ({ children }: PropsWithChildren) => children }));
vi.mock('@/components/ColorSchemeErrorBoundary', () => ({ ColorSchemeErrorBoundary: ({ children }: PropsWithChildren) => children }));
vi.mock('@/components/Hydrate', () => ({ default: ({ children }: PropsWithChildren) => children }));
vi.mock('@/components/OfflineBanner', () => ({ OfflineBanner: () => null }));
vi.mock('@/AppRoutes', () => ({ default: () => <p>Isolated product routes</p> }));

afterEach(() => {
  act(() => { sonnerToast.dismiss(); });
  cleanup();
});

it('shows one compact notification through the real App and provider composition', async () => {
  render(<React.StrictMode><AppProviders><App /></AppProviders></React.StrictMode>);
  act(() => { toast({ title: 'Saved once', description: 'The updated settings have been saved.' }); });
  expect(await screen.findAllByText('Saved once')).toHaveLength(1);
  expect(screen.queryByText('The updated settings have been saved.')).toBeNull();
  expect(document.querySelectorAll('[data-sonner-toaster]')).toHaveLength(1);
  expect(document.querySelectorAll('[data-sonner-toast]')).toHaveLength(1);
});
