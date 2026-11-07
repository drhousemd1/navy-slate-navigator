import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ auth: {} as { user: { id: string }; session: { user: { id: string }; access_token: string } } }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => state.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'http://127.0.0.1:28622', supabasePublicKey: 'public', supabase: { auth: { getSession: vi.fn() } } }));
vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: 'light-turquoise' }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/data/metrics/useActivityMetrics', () => ({ useActivityMetrics: () => ({ data: undefined, error: null, isLoading: false, refetch: vi.fn() }) }));
import { throneTransport } from '@/data/throne/api';
import PersonalThroneCards from '@/components/throne/PersonalThroneCards';
import { newThroneDefinition } from '@/data/throne/schema';
const owner = '10000000-0000-4000-8000-000000000001', other = '20000000-0000-4000-8000-000000000001';
function login(id: string, sessionId = 'first', suffix = 'signature') {
  state.auth = { user: { id }, session: { user: { id }, access_token: `header.${btoa(JSON.stringify({ sub: id, session_id: sessionId }))}.${suffix}` } };
}
beforeEach(() => { login(owner); vi.spyOn(throneTransport, 'read').mockResolvedValue([]); vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('active personal card session boundary', () => {
  it('keeps a draft across token refresh, but discards its view at a new login even for the same account', async () => {
    const view = render(<PersonalThroneCards isMonthlyView={false} />);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Add card' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Add card' }));
    fireEvent.change(screen.getByLabelText('Card title'), { target: { value: 'Unsent private draft' } });
    login(owner, 'first', 'refreshed-token'); view.rerender(<PersonalThroneCards isMonthlyView={false} />);
    expect((screen.getByLabelText('Card title') as HTMLInputElement).value).toBe('Unsent private draft');
    login(owner, 'second'); view.rerender(<PersonalThroneCards isMonthlyView={false} />);
    expect(screen.queryByLabelText('Card title')).toBeNull();
    await waitFor(() => expect(throneTransport.read).toHaveBeenCalledTimes(2));
  });
  it('does not show the prior account card while the next account list is loading', async () => {
    vi.mocked(throneTransport.read).mockImplementation(account => account === owner ? Promise.resolve([{ id: other, ownerId: owner, revision: 1, definition: { ...newThroneDefinition(), title: 'Owner private card' } }]) : new Promise(() => {}));
    const view = render(<PersonalThroneCards isMonthlyView={false} />); await screen.findByText('Owner private card');
    login(other); view.rerender(<PersonalThroneCards isMonthlyView={true} />);
    expect(screen.queryByText('Owner private card')).toBeNull(); expect(screen.getByText('Loading your cards…')).toBeTruthy();
  });
});
