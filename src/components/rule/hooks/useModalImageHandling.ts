
import { useState, useEffect } from 'react';

export const useModalImageHandling = (initialImages: string[]) => {
  const [images, setImages] = useState<string[]>(initialImages);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Update images if initialImages change
  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  const selectImage = (index: number) => {
    setSelectedImageIndex(index);
  };
  
  const updateImage = (url: string) => {
    const newImages = [...images];
    newImages[selectedImageIndex] = url;
    setImages(newImages);
  };

  return { images, selectedImageIndex, selectImage, updateImage };
};
