
import { compressImage, ImageMetadata } from '@/utils/image/compression';
import { logger } from '@/lib/logger';

export const handleImageUpload = async (
  file: File,
  setValue: any,
  setImagePreview: (url: string | null) => void
): Promise<void> => {
  try {
    logger.debug('[Punishment Image] Starting image upload and compression');
    
    // Compress the image
    const { blob, metadata } = await compressImage(file);
    
    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImagePreview(base64String);
      setValue('background_image_url', base64String);
      
      // Store metadata for future use
      setValue('image_meta', metadata);
      
      logger.debug('[Punishment Image] Image processed and set', {
        originalSize: metadata.originalSize,
        compressedSize: metadata.compressedSize,
        savings: `${metadata.compressionRatio}%`
      });
    };
    
    reader.readAsDataURL(blob);
  } catch (error) {
    logger.error('[Punishment Image] Error processing image:', error);
    throw error;
  }
};

export const processImageForSave = async (
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

  // For existing URLs, return as is
  return { processedUrl: imageUrl, metadata: null };
};
