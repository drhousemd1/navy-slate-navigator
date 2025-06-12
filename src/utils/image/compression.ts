
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
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      const originalDimensions = { width: img.width, height: img.height };
      
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = originalDimensions;
      
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = Math.min(width, MAX_WIDTH);
          height = width / aspectRatio;
        } else {
          height = Math.min(height, MAX_HEIGHT);
          width = height * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          const metadata: ImageMetadata = {
            originalSize: file.size,
            compressedSize: blob.size,
            compressionRatio: Math.round((1 - blob.size / file.size) * 100),
            originalDimensions,
            compressedDimensions: { width, height },
            timestamp: new Date().toISOString()
          };

          logger.debug('[Image Compression] Image compressed:', metadata);
          resolve({ blob, metadata });
        },
        'image/jpeg',
        QUALITY
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};
