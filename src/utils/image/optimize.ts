
import imageCompression from 'browser-image-compression';
import { logger } from '@/lib/logger';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  quality?: number;
}

export interface CompressionResult {
  originalFile: File;
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  maxSizeMB: 1, // 1MB max size
  maxWidthOrHeight: 1920, // Max dimension
  useWebWorker: true,
  quality: 0.8 // 80% quality
};

export const THUMBNAIL_OPTIONS: CompressionOptions = {
  maxSizeMB: 0.2, // 200KB max for thumbnails
  maxWidthOrHeight: 400, // Small thumbnails
  useWebWorker: true,
  quality: 0.7
};

/**
 * Compresses an image file using browser-image-compression
 */
export async function compressImage(
  file: File, 
  options: CompressionOptions = DEFAULT_COMPRESSION_OPTIONS
): Promise<CompressionResult> {
  try {
    logger.debug('[Image Compression] Starting compression for:', file.name, 'Size:', file.size);
    
    const compressedFile = await imageCompression(file, {
      maxSizeMB: options.maxSizeMB || 1,
      maxWidthOrHeight: options.maxWidthOrHeight || 1920,
      useWebWorker: options.useWebWorker !== false,
      initialQuality: options.quality || 0.8
    });

    const compressionRatio = ((file.size - compressedFile.size) / file.size) * 100;
    
    logger.debug('[Image Compression] Completed:', {
      original: file.size,
      compressed: compressedFile.size,
      ratio: `${compressionRatio.toFixed(1)}%`
    });

    return {
      originalFile: file,
      compressedFile,
      originalSize: file.size,
      compressedSize: compressedFile.size,
      compressionRatio
    };
  } catch (error) {
    logger.error('[Image Compression] Failed:', error);
    throw new Error(`Image compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Creates a thumbnail version of an image
 */
export async function createThumbnail(file: File): Promise<File> {
  const result = await compressImage(file, THUMBNAIL_OPTIONS);
  return result.compressedFile;
}

/**
 * Validates if a file is a supported image type
 */
export function isValidImageFile(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  return allowedTypes.includes(file.type);
}

/**
 * Gets estimated compression savings for a file
 */
export function getEstimatedSavings(fileSize: number, options: CompressionOptions = DEFAULT_COMPRESSION_OPTIONS): number {
  // Rough estimation based on typical compression ratios
  const quality = options.quality || 0.8;
  const maxSize = (options.maxSizeMB || 1) * 1024 * 1024;
  
  if (fileSize <= maxSize && quality >= 0.8) {
    return Math.min(fileSize * 0.3, fileSize - maxSize); // 30% typical savings
  }
  
  return Math.min(fileSize * 0.5, fileSize - maxSize); // 50% with aggressive compression
}
