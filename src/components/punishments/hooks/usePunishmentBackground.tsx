
import { useState } from 'react';
import { handleImageUpload } from '@/utils/image/punishmentIntegration';
import { logger } from '@/lib/logger';

export const usePunishmentBackground = (initialImageUrl?: string | null) => {
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl || null);

  const handleImageUploadWrapper = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setValue: any
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await handleImageUpload(file, setValue, setImagePreview);
      } catch (error) {
        logger.error('Error uploading punishment image:', error);
      }
    }
  };

  const handleRemoveImage = () => {
    logger.debug("Removing punishment image");
    setImagePreview(null);
  };

  return {
    imagePreview,
    handleImageUpload: handleImageUploadWrapper,
    handleRemoveImage,
    setImagePreview
  };
};
