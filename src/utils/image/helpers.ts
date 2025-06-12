
import { logger } from '@/lib/logger';
import type { Json } from "@/integrations/supabase/types";

export interface ImageMetadata {
  originalUrl?: string;
  thumbnailUrl?: string;
  fullUrl?: string;
  uploadedAt?: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  version?: number;
}

/**
 * Converts ImageMetadata to Json for database storage
 */
export function imageMetadataToJson(meta: ImageMetadata | null | undefined): Json | null {
  if (!meta) return null;
  return meta as Json;
}

/**
 * Converts Json back to ImageMetadata from database
 */
export function jsonToImageMetadata(json: Json | null | undefined): ImageMetadata | null {
  if (!json || typeof json !== 'object') return null;
  return json as ImageMetadata;
}

/**
 * Generates a cache-busting URL with version parameter
 */
export function getCacheBustedUrl(baseUrl: string, version?: number): string {
  if (!baseUrl) return '';
  
  const url = new URL(baseUrl);
  if (version) {
    url.searchParams.set('v', version.toString());
  } else {
    url.searchParams.set('t', Date.now().toString());
  }
  
  return url.toString();
}

/**
 * Gets the appropriate image URL based on context (thumbnail vs full)
 */
export function getOptimalImageUrl(
  imageMeta: ImageMetadata | null, 
  useThumbnail: boolean = false,
  fallbackUrl?: string
): string {
  if (!imageMeta) {
    return fallbackUrl || '';
  }

  let targetUrl = '';
  
  if (useThumbnail && imageMeta.thumbnailUrl) {
    targetUrl = imageMeta.thumbnailUrl;
  } else if (imageMeta.fullUrl) {
    targetUrl = imageMeta.fullUrl;
  } else if (imageMeta.originalUrl) {
    // Fallback to original URL for backward compatibility
    targetUrl = imageMeta.originalUrl;
  } else {
    targetUrl = fallbackUrl || '';
  }

  if (targetUrl && imageMeta.version) {
    return getCacheBustedUrl(targetUrl, imageMeta.version);
  }

  return targetUrl;
}

/**
 * Creates standardized file path for storage
 */
export function createImageStoragePath(
  userId: string, 
  category: 'tasks' | 'rules' | 'rewards' | 'punishments' | 'encyclopedia',
  filename: string,
  variant: 'full' | 'thumbnail' = 'full'
): string {
  const timestamp = Date.now();
  const extension = filename.split('.').pop() || 'jpg';
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
  
  return `${userId}/${category}/${variant}/${sanitizedName}_${timestamp}.${extension}`;
}

/**
 * Extracts metadata from a storage path
 */
export function parseStoragePath(path: string): {
  userId: string;
  category: string;
  variant: string;
  filename: string;
} | null {
  const parts = path.split('/');
  if (parts.length < 4) return null;
  
  return {
    userId: parts[0],
    category: parts[1],
    variant: parts[2],
    filename: parts[3]
  };
}

/**
 * Updates image metadata with new version
 */
export function updateImageMetadata(
  currentMeta: ImageMetadata | null,
  updates: Partial<ImageMetadata>
): ImageMetadata {
  const baseMetadata = currentMeta || {};
  const newVersion = (baseMetadata.version || 0) + 1;
  
  return {
    ...baseMetadata,
    ...updates,
    version: newVersion,
    uploadedAt: new Date().toISOString()
  };
}

/**
 * Creates a temporary preview URL for immediate display
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Cleans up a preview URL to prevent memory leaks
 */
export function revokePreviewUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
    logger.debug('[Image Helpers] Revoked preview URL:', url);
  }
}

/**
 * Validates image metadata structure
 */
export function isValidImageMetadata(meta: any): meta is ImageMetadata {
  return (
    typeof meta === 'object' &&
    meta !== null &&
    (typeof meta.originalUrl === 'string' || typeof meta.originalUrl === 'undefined') &&
    (typeof meta.thumbnailUrl === 'string' || typeof meta.thumbnailUrl === 'undefined') &&
    (typeof meta.fullUrl === 'string' || typeof meta.fullUrl === 'undefined')
  );
}
