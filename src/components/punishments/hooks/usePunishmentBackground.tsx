
import { useState } from 'react';

export const usePunishmentBackground = (initialImageUrl?: string | null) => {
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl || null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleImageUpload called");
    const file = e.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        console.log("Image loaded as base64");
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    console.log("Removing image");
    setImagePreview(null);
  };

  return {
    imagePreview,
    handleImageUpload,
    handleRemoveImage,
    setImagePreview
  };
};
