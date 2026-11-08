vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: 'default' }) }));
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerLinkingSection from '@/components/profile/PartnerLinkingSection';
import { resolveIdentity } from '@/lib/identity';

const mocks = vi.hoisted(() => ({ auth: {} as Record<string, unknown> }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/lib/toastManager', () => ({ toastManager: { success: vi.fn(), error: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => {
  mocks.auth = { relationshipIdentity: { ...resolveIdentity('A', { id: 'A', role: 'dom', linked_partner_id: null }), relationshipId: 'solo', relationshipSessionId: '00000000-0000-4000-8000-000000000090' },
    partnerLinkOptions: { relationshipId: 'solo', relationshipSessionId: '00000000-0000-4000-8000-000000000090', canGenerateFresh: true, invitation: null, archivedRelationships: [] },
    partnerLinkOptionsLoading: false, partnerLinkOptionsError: null, partnerLinkingError: null, reloadPartnerLinkOptions: vi.fn(), partnerLinkingLoading: false, partnerLinkingAvailable: true, generateLinkCode: vi.fn(), previewPartnerCode: vi.fn(),
    linkToPartner: vi.fn().mockResolvedValue(false), unlinkFromPartner: vi.fn() };
});

describe('profile relationship controls', () => {
  it('keeps connection failure details visible beside the controls without relying on toast descriptions', () => {
    const view = render(<PartnerLinkingSection />);
    expect(screen.queryByRole('alert')).toBeNull();
    mocks.auth.partnerLinkingError = 'This invitation changed. Ask your partner for a new code.';
    view.rerender(<PartnerLinkingSection />);
    expect(screen.getByRole('alert').textContent).toBe(mocks.auth.partnerLinkingError);
    expect(screen.getByLabelText('Connect to Partner')).toBeTruthy();
    mocks.auth.partnerLinkingError = null;
    view.rerender(<PartnerLinkingSection />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  const previous = { relationshipId: '00000000-0000-4000-8000-000000000001', startedAt: '2025-01-01T12:00:00Z', endedAt: '2025-03-01T12:00:00Z', formerPartnerLabel: 'Former partner', canGenerateContinue: true };
  const withPrevious = (invitation = null) => {
    mocks.auth.partnerLinkOptions = { ...mocks.auth.partnerLinkOptions as object, invitation, archivedRelationships: [previous] };
  };

  it('requires explicit mode and saved period choices before generating Continue consent', () => {
    withPrevious(); render(<PartnerLinkingSection />);
    const generate = screen.getByRole('button', { name: 'Generate Link Code' }) as HTMLButtonElement;
    expect(generate.disabled).toBe(true);
    expect((screen.getByLabelText('Invite your partner') as HTMLSelectElement).value).toBe('');
    fireEvent.change(screen.getByLabelText('Invite your partner'), { target: { value: 'continue' } });
    expect((screen.getByLabelText('Previous relationship period') as HTMLSelectElement).value).toBe('');
    expect(generate.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Previous relationship period'), { target: { value: previous.relationshipId } });
    expect(screen.getByText(/By generating this invitation, you agree to continue/).textContent).toContain('2025');
    expect(mocks.auth.generateLinkCode).not.toHaveBeenCalled();
    fireEvent.click(generate);
    expect(mocks.auth.generateLinkCode).toHaveBeenCalledExactlyOnceWith('continue', previous.relationshipId);
  });

  it('requires Fresh selection and shows zero-balance consent without silently choosing the latest period', () => {
    withPrevious(); render(<PartnerLinkingSection />);
    fireEvent.change(screen.getByLabelText('Invite your partner'), { target: { value: 'fresh' } });
    expect(screen.getByText(/By generating this invitation, you agree to start/).textContent).toContain('zero balances');
    fireEvent.click(screen.getByRole('button', { name: 'Generate Link Code' }));
    expect(mocks.auth.generateLinkCode).toHaveBeenCalledExactlyOnceWith('fresh', null);
  });

  it('retains exact Continue invitation after reload; changing choices does not relabel the saved code', () => {
    withPrevious({ code: 'A'.repeat(32), mode: 'continue', previousRelationshipId: previous.relationshipId });
    const first = render(<PartnerLinkingSection />); first.unmount(); render(<PartnerLinkingSection />);
    expect((screen.getByLabelText('Your Link Code') as HTMLInputElement).value).toBe('A'.repeat(32));
    expect(screen.getByRole('group', { name: 'Current invitation' }).textContent).toContain('Continue the saved period');
    fireEvent.change(screen.getByLabelText('Invite your partner'), { target: { value: 'fresh' } });
    expect(screen.getByRole('group', { name: 'Current invitation' }).textContent).toContain('Continue the saved period');
    expect(mocks.auth.generateLinkCode).not.toHaveBeenCalled();
  });

  it('suppresses stale-generation metadata and never falls back to the identity-only code', () => {
    withPrevious({ code: 'A'.repeat(32), mode: 'continue', previousRelationshipId: previous.relationshipId });
    mocks.auth.relationshipIdentity = { ...mocks.auth.relationshipIdentity as object, partnerLinkCode: 'B'.repeat(32), relationshipSessionId: '00000000-0000-4000-8000-000000000091' };
    render(<PartnerLinkingSection />);
    expect(screen.queryByLabelText('Your Link Code')).toBeNull();
    expect((screen.getByRole('button', { name: 'Generate Link Code' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps unavailable and deleted periods neutral and gives a failed read an explicit retry', () => {
    mocks.auth.partnerLinkOptions = { ...mocks.auth.partnerLinkOptions as object, archivedRelationships: [{ ...previous, formerPartnerLabel: 'Deleted account', canGenerateContinue: false }] };
    const view = render(<PartnerLinkingSection />);
    fireEvent.change(screen.getByLabelText('Invite your partner'), { target: { value: 'continue' } });
    expect((screen.getByRole('option', { name: /Deleted account/ }) as HTMLOptionElement).disabled).toBe(true);
    mocks.auth.partnerLinkOptions = null; mocks.auth.partnerLinkOptionsError = 'Invitation choices unavailable'; view.rerender(<PartnerLinkingSection />);
    expect(screen.getByRole('alert').textContent).toContain('Invitation choices unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Reload invitation choices' }));
    expect(mocks.auth.reloadPartnerLinkOptions).toHaveBeenCalledTimes(2);
  });

  it('shows the authoritative connected status and staged limitation without a false connect or generate form', () => {
    mocks.auth.relationshipIdentity = { ...resolveIdentity('A', { id: 'A', role: 'sub', linked_partner_id: 'D' }, { id: 'D', role: 'dom', linked_partner_id: 'A' }), relationshipId: 'pair', relationshipSessionId: '00000000-0000-4000-8000-000000000090', partnerRole: 'dom' };
    mocks.auth.partnerLinkingAvailable = false;
    render(<PartnerLinkingSection />);
    expect(screen.getByText('✓ Connected to Partner')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Generate Link Code' })).toBeNull();
    expect(screen.queryByLabelText('Connect to Partner')).toBeNull();
    expect((screen.getByRole('button', { name: 'Unlink' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/temporarily unavailable/)).toBeTruthy();
  });

  it('accepts 32-character codes only after the person reviews and confirms the exact continuation invitation', async () => {
    const consent = { mode: 'continue', previousRelationshipId: 'old-pair', canContinuePrevious: true };
    const preview = vi.mocked(mocks.auth.previewPartnerCode as () => Promise<typeof consent>);
    preview.mockResolvedValue(consent);
    render(<PartnerLinkingSection />);
    const code = 'A'.repeat(32);
    const input = screen.getByLabelText('Connect to Partner') as HTMLInputElement;
    expect(input.maxLength).toBe(32);
    fireEvent.change(input, { target: { value: code } });
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    await screen.findByRole('button', { name: 'Agree and continue' });
    expect(mocks.auth.linkToPartner).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Agree and continue' }));
    await waitFor(() => expect(mocks.auth.linkToPartner).toHaveBeenCalledWith(code, consent));
  });

  it('clears reviewed invitations when the account/period changes', async () => {
    vi.mocked(mocks.auth.previewPartnerCode as () => Promise<unknown>).mockResolvedValue({ mode: 'fresh', previousRelationshipId: null, canContinuePrevious: false });
    const view = render(<PartnerLinkingSection />);
    fireEvent.change(screen.getByLabelText('Connect to Partner'), { target: { value: 'B'.repeat(32) } });
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    await screen.findByRole('button', { name: 'Agree and start fresh' });
    mocks.auth.relationshipIdentity = { ...resolveIdentity('B', { id: 'B', role: 'sub', linked_partner_id: null }), relationshipId: 'different-solo', relationshipSessionId: '00000000-0000-4000-8000-000000000090' };
    view.rerender(<PartnerLinkingSection />);
    expect(screen.queryByRole('button', { name: 'Agree and start fresh' })).toBeNull();
    expect((screen.getByLabelText('Connect to Partner') as HTMLInputElement).value).toBe('');
  });  it('drops reviewed consent and a delayed preview when only the session changes', async () => {
    let resolve!: (value: unknown) => void;
    vi.mocked(mocks.auth.previewPartnerCode as () => Promise<unknown>).mockReturnValue(new Promise(yes => { resolve = yes; }));
    const view = render(<PartnerLinkingSection />);
    fireEvent.change(screen.getByLabelText('Connect to Partner'), { target: { value: 'C'.repeat(32) } });
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    mocks.auth.relationshipIdentity = { ...mocks.auth.relationshipIdentity as object, relationshipSessionId: '00000000-0000-4000-8000-000000000091' };
    view.rerender(<PartnerLinkingSection />);
    await act(async () => resolve({ mode: 'fresh', previousRelationshipId: null, canContinuePrevious: false }));
    expect(screen.queryByRole('button', { name: 'Agree and start fresh' })).toBeNull();
    expect((screen.getByLabelText('Connect to Partner') as HTMLInputElement).value).toBe('');
    expect(mocks.auth.linkToPartner).not.toHaveBeenCalled();
  });

});
