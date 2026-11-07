import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/utils/image/compression', () => ({ compressImage: vi.fn() }));
import { compressImage } from '@/utils/image/compression';
import { readThroneImage } from '@/data/throne/images';
const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='), value => value.charCodeAt(0));
const metadata = { originalSize: 100, compressedSize: bytes.length, compressionRatio: 32, originalDimensions: { width: 1, height: 1 }, compressedDimensions: { width: 1, height: 1 }, timestamp: '2026-11-07T00:00:00.000Z' };
beforeEach(() => vi.mocked(compressImage).mockReset());
afterEach(() => vi.restoreAllMocks());
describe('Throne image admission and accepted compression integration', () => {
  it('uses the existing pixel-decoding compressor and retains actual output bytes and metadata', async () => {
    const file = new File(['input'], 'a.png', { type: 'image/png' });
    vi.mocked(compressImage).mockResolvedValue({ blob: new Blob([bytes], { type: 'image/png' }), metadata });
    const result = await readThroneImage(file);
    expect(compressImage).toHaveBeenCalledWith(file); expect(result.metadata).toEqual(metadata);
    expect(atob(result.dataUrl.split(',')[1])).toBe(String.fromCharCode(...bytes));
  });
  it('rejects input limits and formats before decoding', async () => {
    const tooLarge = new File(['x'], 'huge.png', { type: 'image/png' }); Object.defineProperty(tooLarge, 'size', { value: 12 * 1024 * 1024 + 1 });
    await expect(readThroneImage(tooLarge)).rejects.toThrow('12 MB');
    await expect(readThroneImage(new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' }))).rejects.toThrow('PNG');
    expect(compressImage).not.toHaveBeenCalled();
  });
  it('rejects failed pixel decoding and oversized compressed output instead of a successful draft update', async () => {
    const file = new File(['input'], 'a.png', { type: 'image/png' });
    vi.mocked(compressImage).mockRejectedValueOnce(new Error('Failed to load image'));
    await expect(readThroneImage(file)).rejects.toThrow('Failed to load image');
    const blob = new Blob([bytes], { type: 'image/png' }); Object.defineProperty(blob, 'size', { value: 2 * 1024 * 1024 + 1 });
    vi.mocked(compressImage).mockResolvedValue({ blob, metadata }); await expect(readThroneImage(file)).rejects.toThrow('2 MB');
  });
});
