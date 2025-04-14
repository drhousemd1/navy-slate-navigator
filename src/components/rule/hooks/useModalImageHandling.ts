
import { useState } from 'react';

export const useModalImageHandling = (initialImages: string[]) => {
  const [images, setImages] = useState(initialImages);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const selectImage = (index: number) => setSelectedImageIndex(index);
  const updateImage = (url: string) => {
    const newImages = [...images];
    newImages[selectedImageIndex] = url;
    setImages(newImages);
  };

  return { images, selectedImageIndex, selectImage, updateImage };
};
