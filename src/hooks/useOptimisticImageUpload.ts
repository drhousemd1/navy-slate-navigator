
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useImageUpload, type UseImageUploadOptions } from './useImageUpload';
import { updateImageMetadata, type ImageMetadata } from '@/utils/image/helpers';
import { logger } from '@/lib/logger';

export interface OptimisticImageUploadOptions extends UseImageUploadOptions {
  queryKey: string[];
  entityId?: string;
  updateEntity?: (entityId: string, imageMetadata: ImageMetadata) => void;
}

export function useOptimisticImageUpload(options: OptimisticImageUploadOptions) {
  const { queryKey, entityId, updateEntity, ...uploadOptions } = options;
  const queryClient = useQueryClient();

  const imageUpload = useImageUpload({
    ...uploadOptions,
    onUploadComplete: (result) => {
      logger.debug('[Optimistic Image Upload] Upload completed, updating cache');
      
      // Update React Query cache optimistically
      if (entityId && updateEntity) {
        updateEntity(entityId, result.metadata);
      }
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey });
      
      uploadOptions.onUploadComplete?.(result);
    },
    onUploadError: (error) => {
      logger.error('[Optimistic Image Upload] Upload failed, reverting optimistic update');
      
      // Revert optimistic updates by invalidating cache
      queryClient.invalidateQueries({ queryKey });
      
      uploadOptions.onUploadError?.(error);
    }
  });

  const uploadWithOptimisticUpdate = useCallback(async (file: File, tempMetadata?: Partial<ImageMetadata>) => {
    // Apply optimistic update immediately if entity context is provided
    if (entityId && updateEntity && tempMetadata) {
      const optimisticMetadata = updateImageMetadata(null, tempMetadata);
      updateEntity(entityId, optimisticMetadata);
    }

    // Perform the actual upload
    return imageUpload.uploadImage(file);
  }, [imageUpload.uploadImage, entityId, updateEntity]);

  return {
    ...imageUpload,
    uploadWithOptimisticUpdate
  };
}
