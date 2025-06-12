
import { Json } from '@/data/rewards/types';
import { ImageMetadata, isValidImageMetadata } from './helpers';
import { logger } from '@/lib/logger';

/**
 * Safely converts ImageMetadata to Json for reward database storage
 */
export function rewardImageMetadataToJson(metadata: ImageMetadata | null | undefined): Json | null {
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
    logger.error('[Reward Image Integration] Error converting ImageMetadata to Json:', error);
    return null;
  }
}

/**
 * Safely converts Json to ImageMetadata when reading from reward database
 */
export function rewardJsonToImageMetadata(json: Json | null | undefined): ImageMetadata | null {
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
    logger.error('[Reward Image Integration] Error converting Json to ImageMetadata:', error);
    return null;
  }
}

/**
 * Gets the best available image URL from reward metadata or legacy URL
 */
export function getRewardBestImageUrl(
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

/**
 * Prepares reward data for Supabase storage by ensuring image metadata is properly formatted
 */
export function prepareRewardDataForSupabase(rewardData: any): any {
  const prepared = { ...rewardData };
  
  // Ensure image_meta is properly formatted for database storage
  if (prepared.image_meta !== undefined) {
    prepared.image_meta = rewardImageMetadataToJson(prepared.image_meta);
  }
  
  return prepared;
}
