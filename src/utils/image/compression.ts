
import { logger } from '@/lib/logger';

export interface ImageMetadata {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  originalDimensions: { width: number; height: number };
  compressedDimensions: { width: number; height: number };
  timestamp: string;
}

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const QUALITY = 0.8;

export const compressImage = async (file: File): Promise<{ blob: Blob; metadata: ImageMetadata }> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = objectUrl;
    });

    const originalDimensions = { width: img.naturalWidth, height: img.naturalHeight };
    const { width, height } = originalDimensions;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error('Image has no usable dimensions');
    }
    const scale = Math.min(1, MAX_WIDTH / width, MAX_HEIGHT / height);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // JPEG has no alpha channel. Preserve transparency for other decoded input
    // formats (including files without a MIME hint) with PNG output.
    const outputType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('Failed to compress image')), outputType, QUALITY);
    });

    const metadata: ImageMetadata = {
      originalSize: file.size,
      compressedSize: blob.size,
      compressionRatio: Math.round((1 - blob.size / file.size) * 100),
      originalDimensions,
      compressedDimensions: { width: canvas.width, height: canvas.height },
      timestamp: new Date().toISOString()
    };
    logger.debug('[Image Compression] Image compressed:', metadata);
    return { blob, metadata };
  } finally {
    img.onload = null;
    img.onerror = null;
    URL.revokeObjectURL(objectUrl);
  }
};
