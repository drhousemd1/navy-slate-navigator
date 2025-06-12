
import { Json } from '@/data/tasks/types';
import { ImageMetadata, isValidImageMetadata } from './helpers';
import { logger } from '@/lib/logger';

/**
 * Safely converts ImageMetadata to Json for database storage
 */
export function imageMetadataToJson(metadata: ImageMetadata | null | undefined): Json | null {
  if (!metadata) return null;
  
  try {
    // Convert to a plain object that matches Json type
    const jsonData = {
      originalUrl: metadata.originalUrl,
      thumbnailUrl: metadata.thumbnailUrl,
      fullUrl: metadata.fullUrl,
      uploadedAt: metadata.uploadedAt,
      originalSize: metadata.originalSize,
      compressedSize: metadata.compressedSize,
      compressionRatio: metadata.compressionRatio,
      version: metadata.version
    };
    
    return jsonData as Json;
  } catch (error) {
    logger.error('[Image Integration] Error converting ImageMetadata to Json:', error);
    return null;
  }
}

/**
 * Safely converts Json to ImageMetadata when reading from database
 */
export function jsonToImageMetadata(json: Json | null | undefined): ImageMetadata | null {
  if (!json || typeof json !== 'object') return null;
  
  try {
    const metadata = json as any;
    
    // Validate the structure before returning
    if (isValidImageMetadata(metadata)) {
      return metadata;
    }
    
    // If it's not valid ImageMetadata, it might be legacy data
    // Return null to maintain backward compatibility
    return null;
  } catch (error) {
    logger.error('[Image Integration] Error converting Json to ImageMetadata:', error);
    return null;
  }
}

/**
 * Migrates legacy image URL to new ImageMetadata format
 */
export function migrateLegacyImageUrl(imageUrl: string | null): ImageMetadata | null {
  if (!imageUrl) return null;
  
  return {
    originalUrl: imageUrl,
    fullUrl: imageUrl,
    version: 1,
    uploadedAt: new Date().toISOString()
  };
}

/**
 * Gets the best available image URL from metadata or legacy URL
 */
export function getBestImageUrl(
  metadata: ImageMetadata | null,
  legacyUrl: string | null,
  preferThumbnail: boolean = false
): string | null {
  // Try to get from metadata first
  if (metadata) {
    if (preferThumbnail && metadata.thumbnailUrl) {
      return metadata.thumbnailUrl;
    }
    if (metadata.fullUrl) {
      return metadata.fullUrl;
    }
    if (metadata.originalUrl) {
      return metadata.originalUrl;
    }
  }
  
  // Fallback to legacy URL
  return legacyUrl || null;
}
