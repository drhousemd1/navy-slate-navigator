
import { supabase } from '@/integrations/supabase/client';
import { uploadFile, deleteFiles } from '@/data/storageService';
import { compressImage, createThumbnail, isValidImageFile } from './optimize';
import { createImageStoragePath, updateImageMetadata, type ImageMetadata } from './helpers';
import { logger } from '@/lib/logger';

export interface ImageUploadOptions {
  category: 'tasks' | 'rules' | 'rewards' | 'punishments' | 'encyclopedia';
  userId: string;
  generateThumbnail?: boolean;
  onProgress?: (progress: number) => void;
}

export interface ImageUploadResult {
  metadata: ImageMetadata;
  previewUrl: string;
}

/**
 * Uploads an image with compression and optional thumbnail generation
 */
export async function uploadImageWithCompression(
  file: File,
  options: ImageUploadOptions
): Promise<ImageUploadResult> {
  const { category, userId, generateThumbnail = true, onProgress } = options;

  if (!isValidImageFile(file)) {
    throw new Error('Invalid image file type. Please use JPEG, PNG, WebP, or GIF.');
  }

  logger.debug('[Image Upload] Starting upload for:', file.name);
  
  try {
    // Create preview URL for immediate display
    const previewUrl = URL.createObjectURL(file);
    
    onProgress?.(10);

    // Compress the main image
    const compressionResult = await compressImage(file);
    onProgress?.(30);

    // Generate storage paths
    const fullImagePath = createImageStoragePath(userId, category, file.name, 'full');
    let thumbnailPath: string | undefined;
    
    if (generateThumbnail) {
      thumbnailPath = createImageStoragePath(userId, category, file.name, 'thumbnail');
    }

    onProgress?.(50);

    // Upload full image
    const { publicUrl: fullUrl } = await uploadFile(
      'card_images',
      fullImagePath,
      compressionResult.compressedFile,
      {
        cacheControl: '3600', // 1 hour cache
        upsert: true
      }
    );

    onProgress?.(70);

    // Upload thumbnail if requested
    let thumbnailUrl: string | undefined;
    if (generateThumbnail && thumbnailPath) {
      const thumbnailFile = await createThumbnail(file);
      const { publicUrl } = await uploadFile(
        'card_images',
        thumbnailPath,
        thumbnailFile,
        {
          cacheControl: '3600',
          upsert: true
        }
      );
      thumbnailUrl = publicUrl;
    }

    onProgress?.(90);

    // Create metadata
    const metadata = updateImageMetadata(null, {
      fullUrl,
      thumbnailUrl,
      originalSize: compressionResult.originalSize,
      compressedSize: compressionResult.compressedSize,
      compressionRatio: compressionResult.compressionRatio
    });

    onProgress?.(100);

    logger.debug('[Image Upload] Completed successfully:', {
      fullUrl,
      thumbnailUrl,
      compressionRatio: compressionResult.compressionRatio
    });

    return {
      metadata,
      previewUrl
    };

  } catch (error) {
    logger.error('[Image Upload] Failed:', error);
    throw new Error(`Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deletes images associated with metadata
 */
export async function deleteImageWithMetadata(
  metadata: ImageMetadata,
  userId: string
): Promise<void> {
  const pathsToDelete: string[] = [];

  if (metadata.fullUrl) {
    const fullPath = extractPathFromUrl(metadata.fullUrl);
    if (fullPath) pathsToDelete.push(fullPath);
  }

  if (metadata.thumbnailUrl) {
    const thumbPath = extractPathFromUrl(metadata.thumbnailUrl);
    if (thumbPath) pathsToDelete.push(thumbPath);
  }

  if (pathsToDelete.length > 0) {
    try {
      await deleteFiles('card_images', pathsToDelete);
      logger.debug('[Image Delete] Deleted files:', pathsToDelete);
    } catch (error) {
      logger.error('[Image Delete] Failed:', error);
      throw new Error(`Failed to delete images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Extracts storage path from public URL
 */
function extractPathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/');
    const objectIndex = pathSegments.findIndex(segment => segment === 'object');
    
    if (objectIndex !== -1 && pathSegments.length > objectIndex + 2) {
      // Skip 'object', 'public', and bucket name
      return pathSegments.slice(objectIndex + 3).join('/');
    }
    
    return null;
  } catch (error) {
    logger.error('[Path Extraction] Failed:', error);
    return null;
  }
}
