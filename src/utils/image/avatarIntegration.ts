
import { compressImage, ImageMetadata } from '@/utils/image/compression';
import { logger } from '@/lib/logger';

export const handleAvatarImageUpload = async (
  file: File
): Promise<{ base64String: string; metadata: ImageMetadata } | null> => {
  try {
    logger.debug('[Avatar Image] Starting image upload and compression');
    
    // Compress the image
    const { blob, metadata } = await compressImage(file);
    
    // Convert to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        
        logger.debug('[Avatar Image] Image processed and converted to base64', {
          originalSize: metadata.originalSize,
          compressedSize: metadata.compressedSize,
          savings: `${metadata.compressionRatio}%`
        });
        
        resolve({ base64String, metadata });
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to convert image to base64'));
      };
      
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    logger.error('[Avatar Image] Error processing image:', error);
    return null;
  }
};

export const processAvatarForSave = async (
  imageUrl: string | null
): Promise<{ processedUrl: string | null; metadata: any }> => {
  if (!imageUrl) {
    return { processedUrl: null, metadata: null };
  }

  // If it's already a base64 string, return as is
  if (imageUrl.startsWith('data:')) {
    return { 
      processedUrl: imageUrl, 
      metadata: null // Metadata should already be stored separately
    };
  }

  // For existing URLs, return as is (backward compatibility)
  return { processedUrl: imageUrl, metadata: null };
};
