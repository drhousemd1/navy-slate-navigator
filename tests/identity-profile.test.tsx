import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerLinkingSection from '@/components/profile/PartnerLinkingSection';
import { resolveIdentity } from '@/lib/identity';

const mocks = vi.hoisted(() => ({ auth: {} as Record<string, unknown> }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/lib/toastManager', () => ({ toastManager: { success: vi.fn(), error: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => {
  mocks.auth = { relationshipIdentity: { ...resolveIdentity('A', { id: 'A', role: 'dom', linked_partner_id: null }), relationshipId: 'solo' },
    partnerLinkingLoading: false, partnerLinkingAvailable: true, generateLinkCode: vi.fn(), previewPartnerCode: vi.fn(),
    linkToPartner: vi.fn().mockResolvedValue(false), unlinkFromPartner: vi.fn() };
});

describe('profile relationship controls', () => {
  it('shows the authoritative connected status and staged limitation without a false connect or generate form', () => {
    mocks.auth.relationshipIdentity = { ...resolveIdentity('A', { id: 'A', role: 'sub', linked_partner_id: 'D' }, { id: 'D', role: 'dom', linked_partner_id: 'A' }), relationshipId: 'pair', partnerRole: 'dom' };
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
    mocks.auth.relationshipIdentity = { ...resolveIdentity('B', { id: 'B', role: 'sub', linked_partner_id: null }), relationshipId: 'different-solo' };
    view.rerender(<PartnerLinkingSection />);
    expect(screen.queryByRole('button', { name: 'Agree and start fresh' })).toBeNull();
    expect((screen.getByLabelText('Connect to Partner') as HTMLInputElement).value).toBe('');
  });
});
