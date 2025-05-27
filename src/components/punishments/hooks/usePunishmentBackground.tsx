
import { useState } from 'react';
import { logger } from '@/lib/logger'; // Added logger import

export const usePunishmentBackground = (initialImageUrl?: string | null) => {
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl || null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    logger.log("handleImageUpload called"); // Replaced console.log
    const file = e.target.files?.[0];
    if (file) {
      logger.log("File selected:", file.name); // Replaced console.log
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        logger.log("Image loaded as base64"); // Replaced console.log
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    logger.log("Removing image"); // Replaced console.log
    setImagePreview(null);
  };

  return {
    imagePreview,
    handleImageUpload,
    handleRemoveImage,
    setImagePreview
  };
};

