
import { useState, useEffect, useMemo } from 'react';

interface UsePunishmentImageCarouselProps {
  images: string[];
  initialIndex?: number;
  transitionDuration?: number;
  displayDuration?: number;
  globalIndex?: number;
}

interface ImageCarouselState {
  currentImage: string | null;
  nextImage: string | null;
  isTransitioning: boolean;
  hasMultipleImages: boolean;
}

export const usePunishmentImageCarousel = ({
  images = [],
  initialIndex = 0,
  transitionDuration = 2000,
  displayDuration = 5000,
  globalIndex = 0
}: UsePunishmentImageCarouselProps): ImageCarouselState => {
  // Normalize images array by filtering out nulls and empty strings
  const validImages = useMemo(() => {
    return Array.isArray(images) ? images.filter(Boolean) : [];
  }, [images]);
  
  const hasMultipleImages = validImages.length > 1;
  
  const [currentIndex, setCurrentIndex] = useState(
    initialIndex % (validImages.length || 1)
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextIndex, setNextIndex] = useState<number | null>(null);

  // Effect to handle image transitions based on global index
  useEffect(() => {
    if (!hasMultipleImages) return;
    
    // Calculate the next index based on the global index
    const newIndex = globalIndex % validImages.length;
    
    // If it's different from the current, start transition
    if (newIndex !== currentIndex) {
      setNextIndex(newIndex);
      setIsTransitioning(true);
      
      // After transition duration, update the current index and reset
      const timer = setTimeout(() => {
        setCurrentIndex(newIndex);
        setIsTransitioning(false);
        setNextIndex(null);
      }, transitionDuration);
      
      return () => clearTimeout(timer);
    }
  }, [globalIndex, validImages, hasMultipleImages, currentIndex, transitionDuration]);

  // Get current and next image URLs
  const currentImage = validImages.length > 0 ? validImages[currentIndex] : null;
  const nextImage = nextIndex !== null && validImages.length > 0 
    ? validImages[nextIndex] 
    : null;

  return {
    currentImage,
    nextImage,
    isTransitioning,
    hasMultipleImages
  };
};
