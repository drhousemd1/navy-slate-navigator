
import { useState, useEffect } from 'react';

interface UseImageCarouselProps {
  images: string[];
  initialIndex?: number;
  globalCarouselIndex?: number;
}

interface UseImageCarouselResult {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
  currentIndex: number;
  nextImage: () => void;
}

export const useImageCarousel = ({
  images = [],
  initialIndex = 0,
  globalCarouselIndex = 0
}: UseImageCarouselProps): UseImageCarouselResult => {
  // State for the currently visible image
  const [visibleImage, setVisibleImage] = useState<string | null>(null);
  // State for the image that's transitioning in
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  // Track if a transition is in progress
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Track the current index
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Function to handle transitioning to the next image
  const nextImage = () => {
    if (images.length <= 1 || isTransitioning) return;
    
    const nextIdx = (currentIndex + 1) % images.length;
    setTransitionImage(images[nextIdx]);
    setIsTransitioning(true);
    
    // After transition completes, update the visible image
    setTimeout(() => {
      setVisibleImage(images[nextIdx]);
      setTransitionImage(null);
      setIsTransitioning(false);
      setCurrentIndex(nextIdx);
    }, 2000); // Match transition duration in CSS (2s)
  };
  
  // Initialize the visible image on mount or when images change
  useEffect(() => {
    if (images.length > 0) {
      const initialImg = images[initialIndex % images.length];
      setVisibleImage(initialImg);
      setCurrentIndex(initialIndex % images.length);
    } else {
      setVisibleImage(null);
    }
  }, [images.length > 0 ? images[0] : null]); // Only re-run if first image changes
  
  // Listen for global carousel index changes
  useEffect(() => {
    if (images.length > 1 && !isTransitioning) {
      nextImage();
    }
  }, [globalCarouselIndex]);
  
  return {
    visibleImage,
    transitionImage,
    isTransitioning,
    currentIndex,
    nextImage
  };
};
