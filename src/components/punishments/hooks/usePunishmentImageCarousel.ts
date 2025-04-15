
import { useState, useEffect } from 'react';

interface UsePunishmentImageCarouselProps {
  backgroundImages?: (string | null)[];
  backgroundImageUrl?: string | null;
  carouselTimer?: number;
  globalCarouselIndex?: number;
}

export const usePunishmentImageCarousel = ({
  backgroundImages = [],
  backgroundImageUrl,
  carouselTimer = 5,
  globalCarouselIndex = 0
}: UsePunishmentImageCarouselProps) => {
  // Initialize with default image if provided
  const [currentImage, setCurrentImage] = useState<string | null>(backgroundImageUrl || null);

  // Filter out null/undefined/empty values and create a clean array
  const validImages = [...(backgroundImages || [])]
    .filter((img): img is string => typeof img === 'string' && img.trim() !== '');
  
  // If we have a background image and it's not in the array, add it
  if (backgroundImageUrl && typeof backgroundImageUrl === 'string' && !validImages.includes(backgroundImageUrl)) {
    validImages.unshift(backgroundImageUrl);
  }

  // Use the globalCarouselIndex to cycle through images with the global timer
  useEffect(() => {
    if (validImages.length <= 1) {
      // If we only have one or no images, just set it once and don't rotate
      setCurrentImage(validImages[0] || null);
      return;
    }

    // Calculate which image to show based on global index
    const imageIndex = globalCarouselIndex % validImages.length;
    setCurrentImage(validImages[imageIndex]);
  }, [globalCarouselIndex, validImages]);

  return {
    currentImage,
    hasMultipleImages: validImages.length > 1
  };
};
