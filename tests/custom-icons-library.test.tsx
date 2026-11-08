import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CustomIconsModal from '@/components/task-editor/CustomIconsModal';

const mocks = vi.hoisted(() => ({ from: vi.fn(), list: vi.fn(), upload: vi.fn(), publicUrl: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { storage: { from: mocks.from } } }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  mocks.from.mockReset().mockReturnValue({ list: mocks.list, upload: mocks.upload, getPublicUrl: mocks.publicUrl });
  mocks.list.mockReset().mockResolvedValue({ data: [{ id: 'shared', name: 'shared.png', created_at: '2026-01-01' }], error: null });
  mocks.upload.mockReset().mockResolvedValue({ error: null });
  mocks.publicUrl.mockReset().mockReturnValue({ data: { publicUrl: 'https://example.test/shared.png' } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('custom icon source binding', () => {
  it('uses the existing shared library for existing consumers', async () => {
    const selected = vi.fn(), close = vi.fn();
    render(<CustomIconsModal isOpen onClose={close} onSelectIcon={selected} iconColor="#FFFFFF" />);
    await userEvent.setup().click(await screen.findByTitle('shared.png'));
    expect(mocks.from).toHaveBeenCalledWith('custom-icons');
    expect(mocks.list).toHaveBeenCalledOnce();
    expect(selected).toHaveBeenCalledWith('https://example.test/shared.png');
    expect(close).toHaveBeenCalledOnce();
  });
  it('never lists or writes global storage when a scoped library is supplied', async () => {
    const selected = vi.fn(), upload = vi.fn().mockResolvedValue(undefined);
    const library = { icons: [{ id: 'personal', name: 'Personal icon', url: 'data:image/png;base64,AA==', created_at: '2026-01-01' }], upload };
    render(<CustomIconsModal isOpen onClose={vi.fn()} onSelectIcon={selected} iconColor="#FFFFFF" library={library} />);
    const user = userEvent.setup();
    screen.getByRole('button', { name: 'Personal icon' }).focus();
    await user.keyboard('{Enter}');
    expect(selected).toHaveBeenCalledWith(library.icons[0].url);
    const file = new File(['image'], 'local.png', { type: 'image/png' });
    await user.upload(document.getElementById('icon-upload-input') as HTMLInputElement, file);
    await waitFor(() => expect(upload).toHaveBeenCalledExactlyOnceWith(file));
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
