
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { 
  createThumbnail, 
  createOptimized, 
  isValidImageFile,
  getFileSizeString 
} from '@/utils/image/optimize';
import { 
  generateImagePaths, 
  createImageMeta,
  type ImageMeta 
} from '@/utils/image/helpers';

export interface UploadProgress {
  stage: 'compressing' | 'uploading' | 'complete' | 'error';
  progress: number;
  message: string;
}

export interface UseImageUploadResult {
  uploadImage: (file: File) => Promise<ImageMeta>;
  isUploading: boolean;
  progress: UploadProgress | null;
  previewUrl: string | null;
  resetUpload: () => void;
}

export const useImageUpload = (): UseImageUploadResult => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const resetUpload = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const uploadImage = useCallback(async (file: File): Promise<ImageMeta> => {
    if (!user?.id) {
      throw new Error('User must be authenticated to upload images');
    }

    if (!isValidImageFile(file)) {
      throw new Error('Invalid image file type. Please use JPEG, PNG, WebP, or GIF.');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`File size too large. Maximum size is ${getFileSizeString(maxSize)}`);
    }

    setIsUploading(true);
    
    try {
      // Create optimistic preview
      const tempPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(tempPreviewUrl);

      setProgress({
        stage: 'compressing',
        progress: 10,
        message: 'Compressing image...'
      });

      logger.debug('[useImageUpload] Starting image compression for file:', file.name);

      // Compress images in parallel
      const [thumbnailResult, optimizedResult] = await Promise.all([
        createThumbnail(file),
        createOptimized(file)
      ]);

      setProgress({
        stage: 'uploading',
        progress: 50,
        message: 'Uploading images...'
      });

      // Generate file paths with cache busting version
      const paths = generateImagePaths(user.id, file.name);

      logger.debug('[useImageUpload] Uploading images to storage:', paths);

      // Upload both images in parallel
      const [thumbnailUpload, fullUpload] = await Promise.all([
        supabase.storage
          .from('card_images')
          .upload(paths.thumb, thumbnailResult.file, {
            cacheControl: '3600',
            upsert: true
          }),
        supabase.storage
          .from('card_images')
          .upload(paths.full, optimizedResult.file, {
            cacheControl: '3600',
            upsert: true
          })
      ]);

      if (thumbnailUpload.error) {
        throw new Error(`Thumbnail upload failed: ${thumbnailUpload.error.message}`);
      }

      if (fullUpload.error) {
        throw new Error(`Full image upload failed: ${fullUpload.error.message}`);
      }

      setProgress({
        stage: 'complete',
        progress: 100,
        message: 'Upload complete!'
      });

      // Create image metadata
      const imageMeta = createImageMeta(
        paths.full,
        paths.thumb,
        file.name,
        file.size,
        optimizedResult.compressionRatio,
        paths.version
      );

      logger.debug('[useImageUpload] Upload successful:', {
        originalSize: getFileSizeString(file.size),
        compressedSize: getFileSizeString(optimizedResult.compressedSize),
        compressionRatio: optimizedResult.compressionRatio,
        imageMeta
      });

      toast({
        title: 'Image uploaded successfully',
        description: `Saved ${optimizedResult.compressionRatio}% space through compression`,
      });

      // Clean up temp preview URL
      URL.revokeObjectURL(tempPreviewUrl);
      setPreviewUrl(null);

      return imageMeta;

    } catch (error) {
      logger.error('[useImageUpload] Upload failed:', error);
      
      setProgress({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Upload failed'
      });

      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });

      throw error;
    } finally {
      setIsUploading(false);
      // Clear progress after a short delay
      setTimeout(() => setProgress(null), 2000);
    }
  }, [user?.id]);

  return {
    uploadImage,
    isUploading,
    progress,
    previewUrl,
    resetUpload
  };
};
