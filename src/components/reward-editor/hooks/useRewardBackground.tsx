
import { useState, useCallback } from 'react';
import { handleImageUpload } from '@/utils/image/rewardIntegration';
import { logger } from '@/lib/logger';

export const useRewardBackground = (initialImageUrl?: string | null) => {
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl || null);

  const handleImageUploadWrapper = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    setValue: any
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await handleImageUpload(file, setValue, setImagePreview);
      } catch (error) {
        logger.error('Error uploading image:', error);
      }
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setImagePreview(null);
  }, []);

  return {
    imagePreview,
    handleImageUpload: handleImageUploadWrapper,
    handleRemoveImage,
    setImagePreview
  };
};
