
import { useState } from 'react';

export const useModalImageHandling = (initialImages: string[] = []) => {
  // Ensure initialImages is an array with at least some elements
  const safeInitialImages = Array.isArray(initialImages) && initialImages.length > 0 
    ? initialImages 
    : Array(5).fill('');
  
  const [images, setImages] = useState(safeInitialImages);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const selectImage = (index: number) => setSelectedImageIndex(index);
  const updateImage = (url: string) => {
    const newImages = [...images];
    newImages[selectedImageIndex] = url;
    setImages(newImages);
  };

  return { images, selectedImageIndex, selectImage, updateImage };
};
