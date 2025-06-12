
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface ImageMeta {
  full: string;
  thumb: string;
  originalName: string;
  size: number;
  compressionRatio: number;
  uploadedAt: string;
  version: number;
}

/**
 * Generates a thumbnail URL from a full image URL by replacing 'main.webp' with 'thumb.webp'
 */
export const getThumbUrl = (fullUrl: string): string => {
  if (!fullUrl) return '';
  return fullUrl.replace('/main.webp', '/thumb.webp');
};

/**
 * Generates file paths for storage with user scoping and versioning
 */
export const generateImagePaths = (userId: string, filename: string, version: number = Date.now()) => {
  const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const basePath = `${userId}/${version}_${cleanFilename}`;
  
  return {
    full: `${basePath}/main.webp`,
    thumb: `${basePath}/thumb.webp`,
    version
  };
};

/**
 * Gets the public URL for an image from storage
 */
export const getImagePublicUrl = (path: string): string => {
  if (!path) return '';
  
  const { data } = supabase.storage
    .from('card_images')
    .getPublicUrl(path);
    
  return data?.publicUrl || '';
};

/**
 * Creates image metadata object for database storage
 */
export const createImageMeta = (
  fullPath: string,
  thumbPath: string,
  originalName: string,
  size: number,
  compressionRatio: number,
  version: number
): ImageMeta => {
  return {
    full: getImagePublicUrl(fullPath),
    thumb: getImagePublicUrl(thumbPath),
    originalName,
    size,
    compressionRatio,
    uploadedAt: new Date().toISOString(),
    version
  };
};

/**
 * Extracts image metadata from a stored image_meta JSONB field
 */
export const parseImageMeta = (imageMeta: any): ImageMeta | null => {
  if (!imageMeta || typeof imageMeta !== 'object') {
    return null;
  }
  
  try {
    return {
      full: imageMeta.full || '',
      thumb: imageMeta.thumb || '',
      originalName: imageMeta.originalName || '',
      size: imageMeta.size || 0,
      compressionRatio: imageMeta.compressionRatio || 0,
      uploadedAt: imageMeta.uploadedAt || '',
      version: imageMeta.version || 0
    };
  } catch (error) {
    logger.error('[parseImageMeta] Failed to parse image metadata:', error);
    return null;
  }
};

/**
 * Checks if an image URL is from the legacy system (base64 or external)
 */
export const isLegacyImageUrl = (url: string): boolean => {
  if (!url) return false;
  return url.startsWith('data:') || !url.includes('card_images');
};

/**
 * Gets the best image URL to display (thumbnail or full) based on context
 */
export const getBestImageUrl = (imageMeta: ImageMeta | null, preferThumbnail: boolean = false): string => {
  if (!imageMeta) return '';
  
  if (preferThumbnail && imageMeta.thumb) {
    return imageMeta.thumb;
  }
  
  return imageMeta.full || imageMeta.thumb || '';
};

/**
 * Deletes an image from storage using its metadata
 */
export const deleteImageFromStorage = async (imageMeta: ImageMeta): Promise<void> => {
  try {
    const pathsToDelete = [];
    
    // Extract storage paths from URLs
    if (imageMeta.full) {
      const fullPath = imageMeta.full.split('/card_images/')[1];
      if (fullPath) pathsToDelete.push(fullPath);
    }
    
    if (imageMeta.thumb) {
      const thumbPath = imageMeta.thumb.split('/card_images/')[1];
      if (thumbPath) pathsToDelete.push(thumbPath);
    }
    
    if (pathsToDelete.length > 0) {
      const { error } = await supabase.storage
        .from('card_images')
        .remove(pathsToDelete);
        
      if (error) {
        logger.error('[deleteImageFromStorage] Failed to delete images:', error);
        throw error;
      }
      
      logger.debug('[deleteImageFromStorage] Successfully deleted images:', pathsToDelete);
    }
  } catch (error) {
    logger.error('[deleteImageFromStorage] Error deleting images:', error);
    throw error;
  }
};
