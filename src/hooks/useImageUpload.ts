
import { useState, useCallback } from 'react';
import { uploadImageWithCompression, deleteImageWithMetadata, type ImageUploadOptions, type ImageUploadResult } from '@/utils/image/storage';
import { createPreviewUrl, revokePreviewUrl, type ImageMetadata } from '@/utils/image/helpers';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface UseImageUploadOptions {
  category: ImageUploadOptions['category'];
  onUploadComplete?: (result: ImageUploadResult) => void;
  onUploadError?: (error: Error) => void;
}

export interface UseImageUploadReturn {
  uploadImage: (file: File) => Promise<ImageUploadResult>;
  deleteImage: (metadata: ImageMetadata) => Promise<void>;
  isUploading: boolean;
  uploadProgress: number;
  previewUrl: string | null;
  clearPreview: () => void;
}

export function useImageUpload(options: UseImageUploadOptions): UseImageUploadReturn {
  const { category, onUploadComplete, onUploadError } = options;
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const uploadImage = useCallback(async (file: File): Promise<ImageUploadResult> => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create immediate preview
      const preview = createPreviewUrl(file);
      setPreviewUrl(preview);

      logger.debug('[Image Upload] Starting upload for file:', file.name);

      // Get user ID from auth context
      const response = await fetch('/api/auth/user');
      if (!response.ok) {
        throw new Error('User not authenticated');
      }
      const { user } = await response.json();
      if (!user?.id) {
        throw new Error('User ID not available');
      }

      // Upload with compression
      const result = await uploadImageWithCompression(file, {
        category,
        userId: user.id,
        generateThumbnail: true,
        onProgress: (progress) => {
          setUploadProgress(progress);
        }
      });

      logger.debug('[Image Upload] Upload completed successfully');
      
      onUploadComplete?.(result);
      
      toast({
        title: "Image uploaded successfully",
        description: "Your image has been compressed and uploaded.",
      });

      return result;

    } catch (error) {
      logger.error('[Image Upload] Upload failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      onUploadError?.(error instanceof Error ? error : new Error(errorMessage));
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [category, onUploadComplete, onUploadError, toast]);

  const deleteImage = useCallback(async (metadata: ImageMetadata): Promise<void> => {
    try {
      // Get user ID from auth context
      const response = await fetch('/api/auth/user');
      if (!response.ok) {
        throw new Error('User not authenticated');
      }
      const { user } = await response.json();
      if (!user?.id) {
        throw new Error('User ID not available');
      }

      await deleteImageWithMetadata(metadata, user.id);
      
      logger.debug('[Image Delete] Image deleted successfully');
      
      toast({
        title: "Image deleted",
        description: "Your image has been removed.",
      });

    } catch (error) {
      logger.error('[Image Delete] Delete failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete image';
      
      toast({
        title: "Delete failed",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    }
  }, [toast]);

  const clearPreview = useCallback(() => {
    if (previewUrl) {
      revokePreviewUrl(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  return {
    uploadImage,
    deleteImage,
    isUploading,
    uploadProgress,
    previewUrl,
    clearPreview
  };
}
