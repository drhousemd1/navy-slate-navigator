import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const mocks = vi.hoisted(() => ({ auth: { user: { id: 'owner' } as { id: string } | null, loading: false }, access: vi.fn(), history: vi.fn(), current: vi.fn(), write: vi.fn(), compress: vi.fn() }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://example.supabase.co', supabasePublicKey: 'public', supabase: { auth: { getSession: vi.fn() } } }));
vi.mock('@/data/branding/api', async original => ({ ...await original<typeof import('@/data/branding/api')>(), brandingTransport: { access: mocks.access, history: mocks.history, current: mocks.current, write: mocks.write } }));
vi.mock('@/utils/image/compression', () => ({ compressImage: mocks.compress }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
import LogoUpload from '@/pages/LogoUpload';
import { LogoImage } from '@/components/common/AppLogo';
import { BrandingError } from '@/data/branding/api';
import { LOGO_CONFIG } from '@/config/logoConfig';
import { prepareLogo } from '@/utils/logoUpload';
const original = { id: LOGO_CONFIG.defaultVersionId, objectPath: null, mimeType: null, byteSize: null, sha256: null, createdAt: '2026-11-07T00:00:00Z' };
const uploaded = { id: '10000000-0000-4000-8000-000000000001', objectPath: `versions/10000000-0000-4000-8000-000000000001/${'a'.repeat(64)}.png`, mimeType: 'image/png' as const, byteSize: 50, sha256: 'a'.repeat(64), createdAt: '2026-11-07T01:00:00Z' };
const history = { current: { revision: 1, version: uploaded }, versions: [uploaded, original], selections: [] };
function Page() { const [client] = React.useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } })); return <QueryClientProvider client={client}><LogoUpload /></QueryClientProvider>; }
async function ready() { render(<Page />); await waitFor(() => expect((screen.getByRole('button', { name: 'Select Logo File' }) as HTMLButtonElement).disabled).toBe(false)); }
function select(file = new File(['source'], 'logo.svg', { type: 'image/svg+xml' })) { fireEvent.change(screen.getByLabelText('Choose app logo file'), { target: { files: [file] } }); return file; }
beforeEach(() => {
  mocks.auth = { user: { id: 'owner' }, loading: false };
  mocks.access.mockReset().mockResolvedValue(true); mocks.history.mockReset().mockResolvedValue(history); mocks.current.mockReset().mockResolvedValue(history.current);
  mocks.write.mockReset().mockResolvedValue({}); mocks.compress.mockReset().mockResolvedValue({ blob: new Blob(['pixels'], { type: 'image/png' }) });
});
afterEach(cleanup);
describe('shared app logo controls', () => {
  it('denies direct-page ordinary users and never loads their owner history', async () => {
    mocks.access.mockResolvedValue(false); render(<Page />);
    expect(await screen.findByText(/This account can view/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Select Logo File' })).toBeNull(); expect(mocks.history).not.toHaveBeenCalled();
  });
  it('has a native keyboard file-picker button and converts SVG input to raster before publishing', async () => {
    await ready(); const click = vi.spyOn(screen.getByLabelText('Choose app logo file'), 'click');
    const button = screen.getByRole('button', { name: 'Select Logo File' }); button.focus(); await userEvent.keyboard('{Enter}'); expect(click).toHaveBeenCalled();
    const file = select(); await screen.findByText('Shared logo updated for everyone.');
    expect(mocks.compress).toHaveBeenCalledWith(file);
    expect(mocks.write.mock.calls[0][1]).toMatchObject({ kind: 'upload', expectedRevision: 1, blob: expect.any(Blob) });
    expect(mocks.write.mock.calls[0][1].blob.type).toBe('image/png');
  });
  it('keeps failed conversion draft/current, and failed transport retry sends the same immutable command/blob', async () => {
    await ready(); mocks.compress.mockRejectedValueOnce(new Error('Image could not be decoded'));
    select(); expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Image could not be decoded');
    expect(screen.getByText('Selected file: logo.svg')).toBeTruthy(); expect(mocks.write).not.toHaveBeenCalled();
    mocks.write.mockRejectedValueOnce(new BrandingError('SAVE_UNCONFIRMED'));
    await userEvent.click(screen.getByRole('button', { name: 'Retry selected logo' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('could not be confirmed'));
    const first = mocks.write.mock.calls[0][1];
    await userEvent.click(screen.getByRole('button', { name: 'Retry selected logo' })); await screen.findByText('Shared logo updated for everyone.');
    expect(mocks.write.mock.calls[1][1]).toBe(first); expect(mocks.compress).toHaveBeenCalledTimes(2);
  });
  it('restores an archived ID using the current revision and retains both versions', async () => {
    await ready(); await userEvent.click(screen.getByRole('button', { name: 'Restore Original app logo' }));
    await screen.findByText('Previous logo restored for everyone.');
    expect(mocks.write.mock.calls[0][1]).toMatchObject({ kind: 'restore', versionId: original.id, expectedRevision: 1 });
    expect(screen.getByRole('region', { name: 'Previous app logos' })).toBeTruthy(); expect(screen.getAllByAltText(/logo/i).length).toBe(3);
  });
  it('requires review after a conflict then uses a new command at the refreshed revision', async () => {
    await ready(); mocks.write.mockRejectedValueOnce(new BrandingError('LOGO_REVISION_CONFLICT'));
    mocks.history.mockResolvedValue({ ...history, current: { ...history.current, revision: 2 } });
    select(); await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('changed elsewhere'));
    expect(mocks.write).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Retry selected logo' })); await screen.findByText('Shared logo updated for everyone.');
    expect(mocks.write.mock.calls[1][1].expectedRevision).toBe(2);
    expect(mocks.write.mock.calls[1][1].commandId).not.toBe(mocks.write.mock.calls[0][1].commandId);
  });
  it('does not adopt an old owner response or show editing after an account switch', async () => {
    let finish!: (value: unknown) => void;
    mocks.write.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const view = render(<Page />); await waitFor(() => expect((screen.getByRole('button', { name: 'Select Logo File' }) as HTMLButtonElement).disabled).toBe(false));
    select(); await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(1));
    mocks.auth.user = { id: 'reader' }; mocks.access.mockResolvedValue(false); view.rerender(<Page />);
    await screen.findByText(/This account can view/); await act(async () => finish({}));
    expect(screen.queryByText('Shared logo updated for everyone.')).toBeNull(); expect(screen.queryByText(/Selected file:/)).toBeNull();
  });
  it('exhausts custom/default/fallback only once and resets when a new selected source arrives', () => {
    const view = render(<LogoImage source="https://example.supabase.co/custom.png" />);
    const image = () => screen.getByRole('img') as HTMLImageElement;
    fireEvent.error(image()); expect(image().getAttribute('src')).toBe(LOGO_CONFIG.defaultLogoPath);
    fireEvent.error(image()); expect(image().getAttribute('src')).toBe(LOGO_CONFIG.fallbackLogoPath);
    fireEvent.error(image()); expect(image().tagName).toBe('SPAN');
    view.rerender(<LogoImage source="https://example.supabase.co/next.png" />); expect(image().getAttribute('src')).toContain('/next.png');
  });
  it('rejects invalid source size/type and oversize raster output without claiming success', async () => {
    await expect(prepareLogo(new File([''], 'empty.png', { type: 'image/png' }))).rejects.toThrow('1 byte');
    await expect(prepareLogo(new File(['x'], 'bad.html', { type: 'text/html' }))).rejects.toThrow('PNG');
    mocks.compress.mockResolvedValue({ blob: new Blob([new Uint8Array(LOGO_CONFIG.maxFileSize + 1)], { type: 'image/png' }) });
    await expect(prepareLogo(new File(['x'], 'logo.png', { type: 'image/png' }))).rejects.toThrow('within 10 MB');
  });
});
