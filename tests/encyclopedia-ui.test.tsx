import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: { user: { id: 'account-a' } as { id: string } | null, loading: false }, read: vi.fn(), write: vi.fn(), image: vi.fn() }));
vi.mock('@/contexts/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/contexts/ColorSchemeContext', () => ({ useColorScheme: () => ({ currentScheme: 'default' }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabaseBackendId: 'https://example.supabase.co' }));
vi.mock('@/data/encyclopedia/api', async () => ({ ...await import('@/data/encyclopedia/errors'), encyclopediaTransport: { read: mocks.read, write: mocks.write } }));
vi.mock('@/data/encyclopedia/images', () => ({ readEncyclopediaImage: mocks.image }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: React.PropsWithChildren) => <>{children}</> }));
import Encyclopedia from '@/pages/Encyclopedia';
import { EncyclopediaError } from '@/data/encyclopedia/errors';
import { readEncyclopediaDraft } from '@/data/encyclopedia/store';
import { documentText } from '@/data/encyclopedia/content';
import { entry, receipt, scope, image, deferred } from './encyclopedia.helpers';
import RichArticleEditor from '@/components/encyclopedia/RichArticleEditor';
const clients: QueryClient[] = [];
function setup() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
  return { client, ...render(<QueryClientProvider client={client}><Encyclopedia /></QueryClientProvider>) }; }
beforeEach(() => {
  localStorage.clear(); mocks.auth = { user: { id: 'account-a' }, loading: false };
  mocks.read.mockReset().mockResolvedValue({ canEdit: true, entries: [entry()] }); mocks.write.mockReset().mockImplementation(async (_scope, request) => receipt(request));
  mocks.image.mockReset().mockResolvedValue(image);
  // ProseMirror selection positioning asks for browser geometry, absent in jsdom.
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) });
});
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); clients.length = 0; });
async function edit() { fireEvent.click(await screen.findByRole('button', { name: 'Edit Reference article' })); return await screen.findByRole('dialog', { name: 'Edit Encyclopedia Entry' }); }

describe('real Encyclopedia reader and editorial consumers', () => {
  it('ordinary readers can open preserved content but have no authoring controls', async () => {
    mocks.read.mockResolvedValue({ canEdit: false, entries: [entry()] }); setup();
    const tile = await screen.findByRole('button', { name: 'Reference article Saved description' });
    expect(screen.queryByRole('button', { name: 'Add Entry' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    const background = tile.querySelector('[style*="background-image"]') as HTMLElement;
    expect(background.style.opacity).toBe('0'); expect(background.style.backgroundPosition).toBe('0% 0%');
    fireEvent.click(tile); const popup = screen.getByRole('dialog', { name: 'Reference article' });
    expect(popup.textContent).toContain('Original **literal** text\\nsecond line');
    expect((popup.querySelector('[style*="background-image"]') as HTMLElement).style.opacity).toBe('0');
    expect(popup.querySelector('h1 span')?.getAttribute('style')).toContain('rgb(18, 52, 86)');
    expect(within(popup).queryByRole('button', { name: 'Delete' })).toBeNull();
    fireEvent.click(within(popup).getByRole('button', { name: 'Close encyclopedia entry' })); expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('gives a long article its own named keyboard region while retaining Close and tile focus return', async () => {
    const user = userEvent.setup();
    mocks.read.mockResolvedValue({ canEdit: false, entries: [entry({ contentDocument: { version: 1,
      blocks: Array.from({ length: 60 }, (_, i) => ({ type: 'paragraph', children: [{ type: 'text', text: `Reading marker ${i + 1}` }] })),
    } })] });
    setup(); const tile = await screen.findByRole('button', { name: 'Reference article Saved description' });
    await user.tab(); expect(document.activeElement).toBe(tile); await user.keyboard('{Enter}');
    const popup = screen.getByRole('dialog', { name: 'Reference article' });
    const close = within(popup).getByRole('button', { name: 'Close encyclopedia entry' });
    expect(document.activeElement).toBe(close);
    const regions = within(popup).getAllByRole('region', { name: 'Reference article article content' });
    expect(regions).toHaveLength(1); const article = regions[0];
    expect(within(article).getByText('Reading marker 60')).toBeTruthy(); expect(article.contains(close)).toBe(false);
    await user.tab(); expect(document.activeElement).toBe(article);
    await user.tab(); expect(document.activeElement).toBe(close);
    await user.tab({ shift: true }); expect(document.activeElement).toBe(article);
    await user.keyboard('{Escape}'); await waitFor(() => expect(document.activeElement).toBe(tile));
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.keyboard('{Enter}'); expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close encyclopedia entry' }));
    await user.keyboard('{Enter}'); await waitFor(() => expect(document.activeElement).toBe(tile));
    expect(screen.queryByRole('dialog')).toBeNull(); expect(mocks.write).not.toHaveBeenCalled();
    // jsdom proves semantic focus traversal; actual browser QA owns overflow,
    // PageDown/Home scrolling and the Close button's viewport geometry.
  });
  it('preserves original body/image/metadata on title-only edits and exact zero controls', async () => {
    setup(); const dialog = await edit();
    expect((within(dialog).getByRole('slider', { name: 'Horizontal focal point' }) as HTMLInputElement).value).toBe('0');
    expect((within(dialog).getByRole('slider', { name: 'Popup Image Opacity' }) as HTMLInputElement).value).toBe('0');
    expect((within(dialog).getByRole('checkbox', { name: 'Highlight Effect' }) as HTMLInputElement).checked).toBe(false);
    expect(within(dialog).getByRole('textbox', { name: 'Pop-up Text' }).textContent).toBe(entry().popup_text);
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Title', exact: true }), { target: { value: 'New title' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(mocks.write.mock.calls[0][1].patch).toEqual({ title: 'New title' });
  });
  it('creates an intentionally empty body and explicit theme-default colors, using the saved stable ID', async () => {
    setup(); fireEvent.click(await screen.findByRole('button', { name: 'Add Entry' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Title', exact: true }), { target: { value: 'Empty-body reference' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(1));
    expect(mocks.write.mock.calls[0][1]).toMatchObject({ expectedRevision: 0, patch: { title: 'Empty-body reference', subtext: '', titleColor: null, subtextColor: null, contentDocument: { version: 1, blocks: [] } } });
  });
  it('uses theme colors only for unset colors and never turns that fallback into saved custom colors', async () => {
    mocks.read.mockResolvedValue({ canEdit: true, entries: [entry({ title_color: null, subtext_color: null })] });
    setup(); const tile = await screen.findByRole('button', { name: 'Reference article Saved description' });
    expect(tile.querySelector('h3 span')?.getAttribute('style')).toContain('var(--foreground)');
    expect(tile.querySelector('p span')?.getAttribute('style')).toContain('var(--foreground)');
    fireEvent.click(tile); expect(screen.getByRole('dialog').querySelector('h1 span')?.getAttribute('style')).toContain('var(--foreground)');
    fireEvent.click(screen.getByRole('button', { name: 'Close encyclopedia entry' })); await edit();
    const color = screen.getByRole('textbox', { name: 'Title Color' }) as HTMLInputElement;
    expect(color.value).toBe(''); expect(color.placeholder).toBe('Theme default');
    expect(screen.getByLabelText('Choose title color').parentElement?.getAttribute('style')).toContain('var(--foreground)');
    fireEvent.change(screen.getByRole('textbox', { name: 'Title', exact: true }), { target: { value: 'Text-only entry' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' })); await screen.findByText('Entry saved.');
    expect(mocks.write.mock.calls[0][1].patch).toEqual({ title: 'Text-only entry' });
  });
  it('clears an explicit color only when the editor chooses theme default', async () => {
    setup(); await edit(); fireEvent.click(screen.getByRole('button', { name: 'Use theme default title color' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' })); await screen.findByText('Entry saved.');
    expect(mocks.write.mock.calls[0][1].patch).toEqual({ titleColor: null });
  });
  it('keeps failing create visible and locked, then retries the same request and reports confirmed success', async () => {
    mocks.write.mockRejectedValueOnce(new EncyclopediaError('UNCONFIRMED')); setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Add Entry' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Title', exact: true }), { target: { value: 'Retained creation' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    const retry = await screen.findByRole('button', { name: 'Retry saved request' }); const original = mocks.write.mock.calls[0][1];
    expect((screen.getByRole('textbox', { name: 'Title', exact: true }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toContain('exact request are kept');
    fireEvent.click(retry); await screen.findByText('Entry saved.'); expect(mocks.write.mock.calls[1][1]).toEqual(original);
  });
  it('publishes explicitly edited canonical body and reads its formatting back through the real popup', async () => {
    mocks.write.mockImplementation(async (_scope, request) => {
      mocks.read.mockResolvedValue({ canEdit: true, entries: [entry({ contentDocument: request.patch.contentDocument, revision: 5 })] });
      return receipt(request);
    });
    setup(); await edit(); const textbox = screen.getByRole('textbox', { name: 'Pop-up Text' });
    fireEvent.paste(textbox, { clipboardData: { getData: (kind: string) => kind === 'text/html' ? '<p><b>New bold</b><br><u>New underline</u></p>' : '', files: [] } });
    await waitFor(() => expect(textbox.textContent).toContain('New bold'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' })); await screen.findByText('Entry saved.');
    const saved = mocks.write.mock.calls[0][1].patch.contentDocument;
    expect(saved.version).toBe(1); expect(JSON.stringify(saved)).not.toContain('<b>');
    fireEvent.click(screen.getByRole('button', { name: 'Reference article Saved description' }));
    const popup = screen.getByRole('dialog', { name: 'Reference article' });
    expect(popup.querySelector('span[style*="font-weight: bold"]')?.textContent).toBe('New bold');
    expect(popup.querySelector('span[style*="text-decoration: underline"]')?.textContent).toBe('New underline');
  });
  it('requires a clear delete confirmation and sends no patch', async () => {
    setup(); await edit(); fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));
    expect(mocks.write).not.toHaveBeenCalled(); expect(screen.getByRole('group', { name: 'Confirm deletion' }).textContent).toContain('shared library for everyone');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' })); await screen.findByText('Entry deleted.');
    expect(mocks.write.mock.calls[0][1]).toMatchObject({ kind: 'delete', expectedRevision: 4 }); expect(mocks.write.mock.calls[0][1]).not.toHaveProperty('patch');
  });
  it('removes authoring controls after revoked permission but preserves the pending draft', async () => {
    const { client } = setup(); await edit(); fireEvent.change(screen.getByRole('textbox', { name: 'Title', exact: true }), { target: { value: 'Keep draft' } });
    mocks.read.mockResolvedValue({ canEdit: false, entries: [entry()] }); await act(async () => client.refetchQueries());
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Delete', exact: true })).toBeNull()); expect(screen.queryByRole('button', { name: 'Add Entry' })).toBeNull();
    expect((screen.getByRole('textbox', { name: 'Title', exact: true }) as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(readEncyclopediaDraft(scope)?.patch.title).toBe('Keep draft');
    expect(screen.getByText('Editorial permission is required to resume it. Your draft is kept.')).toBeTruthy();
  });
  it('distinguishes image keep/remove/replace; image read failure keeps old image and failed save retains replacement', async () => {
    setup(); await edit(); mocks.image.mockRejectedValueOnce(new Error('Unsupported raster'));
    fireEvent.change(screen.getByLabelText('Background Image'), { target: { files: [new File(['x'], 'invalid.svg')] } });
    await screen.findByText('Unsupported raster'); expect(screen.getByRole('button', { name: 'Remove Image' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Image' })); expect(screen.queryByRole('button', { name: 'Remove Image' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Background Image'), { target: { files: [new File(['x'], 'new.png')] } });
    await screen.findByRole('button', { name: 'Remove Image' }); mocks.write.mockRejectedValueOnce(new EncyclopediaError('UNCONFIRMED'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' })); await screen.findByRole('button', { name: 'Retry saved request' });
    expect(mocks.write.mock.calls[0][1].patch.image).toEqual({ op: 'replace', dataUrl: image }); expect(readEncyclopediaDraft(scope)?.patch.image).toEqual({ op: 'replace', dataUrl: image });
  });
  it('does not apply a late image after the editor closes', async () => {
    const pending = deferred<string>(); mocks.image.mockReturnValueOnce(pending.promise); setup(); await edit();
    fireEvent.change(screen.getByLabelText('Background Image'), { target: { files: [new File(['x'], 'new.png')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); await act(async () => pending.resolve(image));
    expect(readEncyclopediaDraft(scope)?.patch).not.toHaveProperty('image');
  });
  it('formats real editor input into canonical marks, with safe paste and no mount/lock rewrite', async () => {
    const changed = vi.fn(); const initial = { version: 1 as const, blocks: [{ type: 'paragraph' as const, children: [{ type: 'text' as const, text: 'Original' }] }] };
    const view = render(<RichArticleEditor initialDocument={initial} disabled={false} onChange={changed} />);
    const textbox = await screen.findByRole('textbox', { name: 'Pop-up Text' }); expect(changed).not.toHaveBeenCalled();
    view.rerender(<RichArticleEditor initialDocument={initial} disabled onChange={changed} />); expect(changed).not.toHaveBeenCalled();
    view.rerender(<RichArticleEditor initialDocument={initial} disabled={false} onChange={changed} />); expect(changed).not.toHaveBeenCalled();
    fireEvent.paste(textbox, { clipboardData: { getData: (kind: string) => kind === 'text/html' ? '<p><b>Bold</b><i>Italic</i><u>Underline</u><span style="font-size:2rem">Large</span><br>End<script>unsafe()</script></p>' : '', files: [] } });
    await waitFor(() => expect(changed).toHaveBeenCalled()); const doc = changed.mock.calls.at(-1)![0];
    expect(documentText(doc)).toContain('BoldItalicUnderlineLarge\nEnd'); expect(JSON.stringify(doc)).not.toContain('unsafe');
    expect(JSON.stringify(doc)).toContain('"bold":true'); expect(JSON.stringify(doc)).toContain('"italic":true'); expect(JSON.stringify(doc)).toContain('"underline":true'); expect(JSON.stringify(doc)).toContain('"fontSize":"2rem"');
    expect(screen.getByRole('button', { name: 'Bold' })).toBeTruthy(); expect(screen.getByRole('combobox', { name: 'Font size' }).children).toHaveLength(5);
  });
});
