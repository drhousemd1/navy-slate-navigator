import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://example.supabase.co', supabasePublicKey: 'public', supabase: { auth: { getSession: vi.fn() } } }));
import { createBrandingTransport, brandingErrorText } from '@/data/branding/api';
import { logoSource, currentSchema, type LogoIntent } from '@/data/branding/schema';
import { LOGO_CONFIG } from '@/config/logoConfig';
const account = '10000000-0000-4000-8000-000000000001';
const command = '20000000-0000-4000-8000-000000000001';
const version = { id: command, objectPath: `versions/${command}/${'a'.repeat(64)}.png`, sha256: 'a'.repeat(64), mimeType: 'image/png' as const, byteSize: 50, createdAt: '2026-11-07T00:00:00Z' };
const intent: LogoIntent = { commandId: command, expectedRevision: 0, kind: 'upload', blob: new Blob(['image'], { type: 'image/png' }) };
const session = vi.fn(), fetcher = vi.fn();
const make = () => createBrandingTransport({ backend: 'https://example.supabase.co', publicKey: 'public', session, fetch: fetcher, timeoutMs: 100 });
const receipt = { commandId: command, versionId: command, revision: 1, replayed: false };
beforeEach(() => { session.mockReset().mockResolvedValue({ accountId: account, token: 'captured-token' }); fetcher.mockReset().mockResolvedValue(Response.json(receipt)); });
describe('shared branding transport', () => {
  it('publishes exact binary bytes with captured account, stable command and revision zero', async () => {
    expect(await make().write(account, intent)).toEqual(receipt);
    const [url, request] = fetcher.mock.calls[0];
    expect(url).toBe('https://example.supabase.co/functions/v1/app-branding/upload');
    expect(request.body).toBe(intent.blob); expect(request.redirect).toBe('error');
    expect(request.headers).toMatchObject({ Authorization: 'Bearer captured-token', 'x-command-id': command, 'x-expected-revision': '0', 'Content-Type': 'image/png' });
  });
  it('restores an existing version ID without an arbitrary URL or uploaded bytes', async () => {
    const restore = { ...intent, kind: 'restore' as const, versionId: LOGO_CONFIG.defaultVersionId };
    fetcher.mockResolvedValue(Response.json({ ...receipt, versionId: restore.versionId }));
    await make().write(account, restore);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ versionId: restore.versionId });
  });
  it('rejects an account change before send and after a delayed response', async () => {
    session.mockResolvedValueOnce({ accountId: 'another', token: 'other' });
    await expect(make().write(account, intent)).rejects.toThrow('ACCOUNT_CHANGED'); expect(fetcher).not.toHaveBeenCalled();
    session.mockResolvedValueOnce({ accountId: account, token: 'captured' }).mockResolvedValueOnce({ accountId: 'another', token: 'other' });
    await expect(make().write(account, intent)).rejects.toThrow('ACCOUNT_CHANGED');
  });
  it('uses public credentials for selected artwork without touching an account session', async () => {
    fetcher.mockResolvedValue(Response.json({ revision: 0, version }));
    expect(await make().current()).toEqual({ revision: 0, version }); expect(session).not.toHaveBeenCalled();
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer public');
  });
  it.each([{ ...receipt, revision: 2 }, { ...receipt, versionId: account }, {}])('never accepts mismatched commit receipt %#', async value => {
    fetcher.mockResolvedValue(Response.json(value)); await expect(make().write(account, intent)).rejects.toThrow();
  });
  it('keeps revision conflicts specific and private backend errors out of UI text', async () => {
    fetcher.mockResolvedValue(Response.json({ error: { code: 'LOGO_REVISION_CONFLICT', message: 'private' } }, { status: 409 }));
    const error = await make().write(account, intent).catch(e => e);
    expect(error.code).toBe('LOGO_REVISION_CONFLICT'); expect(brandingErrorText(error)).toContain('changed elsewhere'); expect(brandingErrorText(error)).not.toContain('private');
  });
  it('bounds a lost response and does not send after cancellation', async () => {
    fetcher.mockImplementation(() => new Promise(() => {}));
    await expect(make().write(account, intent)).rejects.toThrow('SAVE_UNCONFIRMED');
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    fetcher.mockClear(); const abort = new AbortController(); abort.abort();
    await expect(make().write(account, intent, abort.signal)).rejects.toThrow(); expect(fetcher).not.toHaveBeenCalled();
  });
  it('renders only exact validated version paths and the preserved default', () => {
    expect(logoSource(version, 'https://example.supabase.co')).toBe(`https://example.supabase.co/storage/v1/object/public/app-branding/${version.objectPath}`);
    expect(logoSource(undefined, 'https://example.supabase.co')).toBe(LOGO_CONFIG.defaultLogoPath);
    for (const objectPath of ['https://evil.example/logo.svg', '../private/image', `versions/${command}/../../logo.png`]) {
      expect(() => currentSchema.parse({ revision: 1, version: { ...version, objectPath } })).toThrow();
    }
  });
});
