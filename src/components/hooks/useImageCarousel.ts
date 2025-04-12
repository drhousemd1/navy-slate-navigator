
import { useState, useEffect } from 'react';

interface UseImageCarouselProps {
  images: string[];
  globalCarouselIndex: number;
}

export const useImageCarousel = ({ 
  images,
  globalCarouselIndex
}: UseImageCarouselProps) => {
  const [visibleImage, setVisibleImage] = useState<string | null>(null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [internalIndex, setInternalIndex] = useState(0);

  // Update internal state when images array changes
  useEffect(() => {
    if (images && images.length > 0) {
      setVisibleImage(images[0]);
    } else {
      setVisibleImage(null);
    }
  }, [images]);

  // Handle carousel rotation based on global index
  useEffect(() => {
    if (!images || images.length < 2) return;

    // Calculate the correct index based on the global index
    const targetIndex = globalCarouselIndex % images.length;
    
    if (targetIndex !== internalIndex) {
      // Prepare for transition
      setTransitionImage(images[targetIndex]);
      setIsTransitioning(true);
      
      // Complete transition after animation
      const timer = setTimeout(() => {
        setVisibleImage(images[targetIndex]);
        setTransitionImage(null);
        setIsTransitioning(false);
        setInternalIndex(targetIndex);
      }, 2000); // Match the CSS transition duration
      
      return () => clearTimeout(timer);
    }
  }, [globalCarouselIndex, images, internalIndex]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning,
    currentIndex: internalIndex,
  };
};
