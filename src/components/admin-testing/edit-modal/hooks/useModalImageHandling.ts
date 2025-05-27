
import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/lib/logger'; // Added logger

export const useModalImageHandling = (initialImageUrl?: string | null) => {
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl || null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    // If initialImageUrl changes externally, update the preview
    // This is useful if the modal is re-opened with different data
    setImagePreview(initialImageUrl || null);
    setImageFile(null); // Reset file when initial URL changes
  }, [initialImageUrl]);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      logger.log("handleImageUpload file name:", file ? file.name : 'null');
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        logger.log("Image preview set to (base64):", base64String ? base64String.substring(0, 50) + "..." : null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const triggerImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = handleImageUpload as (event: Event) => void; // Cast for compatibility
    input.click();
  }, [handleImageUpload]);

  const handleRemoveImage = useCallback(() => {
    logger.log("Removing image preview. Was:", imagePreview ? '[IMAGE_URL_REDACTED]' : null);
    setImagePreview(null);
    setImageFile(null);
  }, [imagePreview]);
  
  const resetImage = useCallback(() => {
    logger.log("Resetting image. Initial URL:", initialImageUrl ? '[IMAGE_URL_REDACTED]' : null);
    setImagePreview(initialImageUrl || null);
    setImageFile(null);
  }, [initialImageUrl]);

  return {
    imagePreview,
    setImagePreview, // Expose for direct setting if needed
    imageFile,
    setImageFile, // Expose for direct setting if needed
    handleImageUpload: triggerImageUpload, // Use the trigger function for button clicks
    handleRemoveImage,
    resetImage,
    directImageUploadHandler: handleImageUpload, // Expose original handler for direct input use
  };
};
