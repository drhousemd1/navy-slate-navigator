
import { useState } from 'react';
import { logger } from '@/lib/logger';

export const usePunishmentBackground = (initialImageUrl?: string | null) => {
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl || null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    logger.debug("handleImageUpload called");
    const file = e.target.files?.[0];
    if (file) {
      logger.debug("File selected:", file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        logger.debug("Image loaded as base64");
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    logger.debug("Removing image");
    setImagePreview(null);
  };

  return {
    imagePreview,
    handleImageUpload,
    handleRemoveImage,
    setImagePreview
  };
};
