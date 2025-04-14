
import { useState, useEffect } from 'react';

export const useImageCarousel = (images: string[], timer: number) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    // Only set up the interval if we have multiple images
    if (images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, timer * 1000);

    return () => clearInterval(interval);
  }, [images, timer]);

  // Return the current image or null if no images
  return images.length > 0 ? images[currentImageIndex] : null;
};
