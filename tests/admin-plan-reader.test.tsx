import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VerifiedPublication } from '@/features/admin-documents/publication';

const f = vi.hoisted(() => ({ userId: 'reader-a' as string | null, rpc: vi.fn(), read: vi.fn(), getSession: vi.fn(), store: vi.fn() }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => ({ user: f.userId ? { id: f.userId } : null, loading: false }) }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => <button onClick={onClick}>{children}</button> }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'http://127.0.0.1:28622', supabasePublicKey: 'synthetic-public',
  supabase: { rpc: f.rpc, auth: { getSession: f.getSession } } }));
vi.mock('@/features/admin-documents/publication', async original => ({ ...await original<typeof import('@/features/admin-documents/publication')>(), readPublication: f.read }));
vi.mock('@/features/admin-documents/storage', () => ({ createPublicationStore: f.store }));
import AdminRebuildPlan from '@/pages/AdminRebuildPlan';
import { PublicationError } from '@/features/admin-documents/publication';

function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function publication(sequence = 1, hash = 'a'.repeat(64)): VerifiedPublication {
  const manifest = { version: `v${sequence}`, title: 'Private rebuild plan', updatedAt: '2026-10-26T00:00:00.000Z', object: `plan-${hash}.html`, sha256: hash };
  const head = { sequence, sha256: String(sequence).repeat(64), documentVersion: manifest.version, documentSha256: hash };
  return { manifest, head, chain: [head], publishedAt: '2026-11-07T00:00:00.000Z', html: `<html><body>Publication ${sequence}</body></html>` };
}
const iframe = () => screen.queryByTitle('Private rebuild plan');
beforeEach(() => {
  f.userId = 'reader-a'; f.rpc.mockReset().mockResolvedValue({ data: true, error: null });
  f.read.mockReset().mockResolvedValue(publication()); f.store.mockReset().mockReturnValue({});
  f.getSession.mockReset().mockImplementation(async () => ({ data: { session: { user: { id: f.userId }, access_token: 'synthetic-session' } }, error: null }));
});
afterEach(cleanup);

describe('private plan reader publication and identity boundaries', () => {
  it('renders the verified publication with unchanged opaque sandbox and publication date wording', async () => {
    render(<AdminRebuildPlan />); const frame = await screen.findByTitle('Private rebuild plan');
    expect(frame.getAttribute('srcdoc')).toContain('Publication 1');
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-popups allow-popups-to-escape-sandbox');
    expect(frame.getAttribute('sandbox')).not.toContain('allow-same-origin'); expect(frame.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(screen.getByText(/^Published /)).toBeTruthy();
    expect(screen.queryByText(/Historical plan/)).toBeNull();
    expect(f.rpc).toHaveBeenCalledWith('can_read_admin_document', {});
    expect(f.store.mock.calls[0][0].bearer).toBe('synthetic-session');
  });
  it('hides cached HTML while rechecking membership, then allows visibly stale same-user content after a failed refresh', async () => {
    render(<AdminRebuildPlan />); await screen.findByTitle('Private rebuild plan');
    const access = deferred<{ data: boolean; error: null }>(); f.rpc.mockReturnValueOnce(access.promise);
    f.read.mockRejectedValueOnce(new PublicationError('storage', 'Unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh plan' })); expect(iframe()).toBeNull();
    expect(f.read).toHaveBeenCalledTimes(1);
    await act(async () => access.resolve({ data: true, error: null }));
    await screen.findByText('Refresh failed. Showing the last verified version.');
    expect(iframe()?.getAttribute('srcdoc')).toContain('Publication 1'); expect(f.rpc).toHaveBeenCalledTimes(2);
  });
  it.each(['denied', 'error'] as const)('never shows previous HTML when the new membership check is %s', async status => {
    render(<AdminRebuildPlan />); await screen.findByTitle('Private rebuild plan');
    f.rpc.mockResolvedValueOnce(status === 'denied' ? { data: false, error: null } : { data: null, error: new Error('Unavailable') });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh plan' }));
    await screen.findByText(status === 'denied' ? /available only to the project administrator/ : /The plan could not be loaded/);
    expect(iframe()).toBeNull(); expect(f.read).toHaveBeenCalledTimes(1);
  });
  it('clears previous HTML when Storage denies access after membership passed', async () => {
    render(<AdminRebuildPlan />); await screen.findByTitle('Private rebuild plan');
    f.read.mockRejectedValueOnce(new PublicationError('access', 'Denied'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh plan' })); await screen.findByText(/The plan could not be loaded/);
    expect(iframe()).toBeNull(); expect(screen.queryByText(/Showing the last verified version/)).toBeNull();
  });
  it('clears on account switch and ignores the previous account’s late completion', async () => {
    const pending = deferred<VerifiedPublication>(); f.read.mockReturnValueOnce(pending.promise);
    const view = render(<AdminRebuildPlan />); await waitFor(() => expect(f.read).toHaveBeenCalledTimes(1));
    f.userId = 'reader-b'; const access = deferred<{ data: boolean; error: null }>(); f.rpc.mockReturnValueOnce(access.promise);
    view.rerender(<AdminRebuildPlan />); expect(iframe()).toBeNull();
    await act(async () => pending.resolve(publication(1))); expect(iframe()).toBeNull();
    f.read.mockResolvedValueOnce(publication(2)); await act(async () => access.resolve({ data: true, error: null }));
    const frame = await screen.findByTitle('Private rebuild plan'); expect(frame.getAttribute('srcdoc')).toContain('Publication 2');
    f.userId = null; view.rerender(<AdminRebuildPlan />); expect(iframe()).toBeNull();
  });
  it('keeps the dated-baseline qualification when a later publication selects old verified content', async () => {
    const old = publication(4, '1785c7f5dd8a3fd7469dc87ab2e6285fe2b78e627fc990a82a79e871551cd672'); old.manifest.version = 'v1-historical';
    f.read.mockResolvedValueOnce(old); render(<AdminRebuildPlan />); await screen.findByTitle('Private rebuild plan');
    expect(screen.getByText(/Historical plan; later implementation changes are not included/)).toBeTruthy();
    expect(screen.getByText(/^Published /)).toBeTruthy();
    expect(screen.queryByText(/Updated/)).toBeNull();
  });
});
