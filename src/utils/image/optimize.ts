
import imageCompression from 'browser-image-compression';
import { logger } from '@/lib/logger';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  quality?: number;
}

export interface CompressedImageResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Compresses an image file with specified options
 */
export const compressImage = async (
  file: File,
  maxWidthOrHeight: number = 1200,
  quality: number = 0.8,
  maxSizeMB: number = 1
): Promise<CompressedImageResult> => {
  try {
    const originalSize = file.size;
    
    const options: CompressionOptions = {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      quality,
    };

    logger.debug('[compressImage] Starting compression:', {
      originalSize: Math.round(originalSize / 1024),
      options
    });

    const compressedFile = await imageCompression(file, options);
    const compressedSize = compressedFile.size;
    const compressionRatio = Math.round(((originalSize - compressedSize) / originalSize) * 100);

    logger.debug('[compressImage] Compression complete:', {
      originalSize: Math.round(originalSize / 1024),
      compressedSize: Math.round(compressedSize / 1024),
      compressionRatio
    });

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      compressionRatio
    };
  } catch (error) {
    logger.error('[compressImage] Compression failed:', error);
    throw new Error(`Image compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Creates a thumbnail version of an image
 */
export const createThumbnail = async (file: File): Promise<CompressedImageResult> => {
  return compressImage(file, 320, 0.6, 0.2);
};

/**
 * Creates a full-size optimized version of an image
 */
export const createOptimized = async (file: File): Promise<CompressedImageResult> => {
  return compressImage(file, 1200, 0.8, 1);
};

/**
 * Validates if a file is a supported image type
 */
export const isValidImageFile = (file: File): boolean => {
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  return supportedTypes.includes(file.type.toLowerCase());
};

/**
 * Gets file size in a human-readable format
 */
export const getFileSizeString = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
