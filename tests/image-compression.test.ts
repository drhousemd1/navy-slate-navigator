import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compressImage } from '@/utils/image/compression';

vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn() } }));

// jsdom has no image decoder/canvas. These checks cover the resize/encoding
// contract and resource cleanup, not decoded pixels or visual transparency.
let dimensions: { width: number; height: number };
let decodeFails: boolean;
let draw: ReturnType<typeof vi.fn>;
let encode: ReturnType<typeof vi.fn>;
let createUrl: ReturnType<typeof vi.fn>;
let revokeUrl: ReturnType<typeof vi.fn>;
let encodedDimensions: { width: number; height: number };

beforeEach(() => {
  dimensions = { width: 1920, height: 1500 };
  decodeFails = false;
  draw = vi.fn();
  encode = vi.fn(function (this: HTMLCanvasElement, callback: BlobCallback, type?: string) {
    encodedDimensions = { width: this.width, height: this.height };
    callback(new Blob(['encoded image'], { type }));
  });
  createUrl = vi.fn(() => 'blob:owned-image');
  revokeUrl = vi.fn();
  vi.stubGlobal('Image', class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    get width() { return dimensions.width; }
    get height() { return dimensions.height; }
    get naturalWidth() { return dimensions.width; }
    get naturalHeight() { return dimensions.height; }
    set src(_value: string) { queueMicrotask(() => decodeFails ? this.onerror?.() : this.onload?.()); }
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({ drawImage: draw }) as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(encode);
  vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: createUrl, revokeObjectURL: revokeUrl }));
});
afterEach(() => { vi.unstubAllGlobals(); });

const input = (type = 'image/png') => new File(['original image bytes'], 'selected-image', { type });

describe('shared image compression contract', () => {
  it.each([
    [1920, 1500, 1382, 1080],
    [4000, 3000, 1440, 1080],
    [1000, 2000, 540, 1080],
    [6000, 100, 1920, 32],
    [100, 50, 100, 50],
  ])('fits %ix%i into both bounds without upscaling', async (width, height, finalWidth, finalHeight) => {
    dimensions = { width, height };
    const { metadata } = await compressImage(input());
    expect(encodedDimensions).toEqual({ width: finalWidth, height: finalHeight });
    expect(metadata.originalDimensions).toEqual({ width, height });
    expect(metadata.compressedDimensions).toEqual(encodedDimensions);
    expect(draw).toHaveBeenCalledWith(expect.anything(), 0, 0, finalWidth, finalHeight);
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:owned-image');
  });

  it.each(['image/png', 'image/webp', 'image/gif', 'image/svg+xml', ''])('uses an alpha-capable output for %s without rejecting a decoded input', async type => {
    const { blob, metadata } = await compressImage(input(type));
    expect(blob.type).toBe('image/png');
    expect(metadata.compressedSize).toBe(blob.size);
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:owned-image');
  });

  it('retains the existing JPEG quality for JPEG inputs', async () => {
    const { blob } = await compressImage(input('image/jpeg'));
    expect(blob.type).toBe('image/jpeg');
    expect(encode).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.8);
  });

  it.each(['decode', 'dimensions', 'draw', 'empty encoding', 'thrown encoding'] as const)('rejects %s failures and releases its object URL', async failure => {
    if (failure === 'decode') decodeFails = true;
    if (failure === 'dimensions') dimensions = { width: 0, height: 1500 };
    if (failure === 'draw') draw.mockImplementation(() => { throw new Error('Drawing failed'); });
    if (failure === 'empty encoding') encode.mockImplementation((callback: BlobCallback) => callback(null));
    if (failure === 'thrown encoding') encode.mockImplementation(() => { throw new Error('Encoding failed'); });
    await expect(compressImage(input())).rejects.toThrow();
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:owned-image');
  });

  it('does not allocate an object URL if a canvas cannot be created', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await expect(compressImage(input())).rejects.toThrow();
    expect(createUrl).not.toHaveBeenCalled();
  });
});
