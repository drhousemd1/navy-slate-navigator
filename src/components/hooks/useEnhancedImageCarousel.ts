
import { useState, useEffect, useRef } from 'react';

interface UseEnhancedImageCarouselProps {
  images: (string | null)[];
  globalCarouselIndex?: number;
  carouselTimer?: number;
  autoAdvance?: boolean;
}

interface UseEnhancedImageCarouselResult {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
  currentIndex: number;
  advanceToNextImage: () => void;
  selectSpecificImage: (index: number) => void;
}

export const useEnhancedImageCarousel = ({
  images,
  globalCarouselIndex,
  carouselTimer = 5,
  autoAdvance = false
}: UseEnhancedImageCarouselProps): UseEnhancedImageCarouselResult => {
  const filteredImages = images.filter((img): img is string => !!img);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleImage, setVisibleImage] = useState<string | null>(
    filteredImages.length > 0 ? filteredImages[0] : null
  );
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const prevGlobalIndexRef = useRef(globalCarouselIndex);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to handle changes to image array
  useEffect(() => {
    if (filteredImages.length > 0) {
      // If the current index is out of bounds with the new array, reset to 0
      if (currentIndex >= filteredImages.length) {
        setCurrentIndex(0);
        setVisibleImage(filteredImages[0]);
      } else if (visibleImage !== filteredImages[currentIndex]) {
        // Update visible image if it's different from what should be shown at the current index
        setVisibleImage(filteredImages[currentIndex]);
      }
    } else {
      setVisibleImage(null);
    }
  }, [filteredImages, currentIndex]);

  // Effect to handle global carousel index changes
  useEffect(() => {
    if (globalCarouselIndex !== undefined && 
        globalCarouselIndex !== prevGlobalIndexRef.current && 
        filteredImages.length > 1) {
      
      prevGlobalIndexRef.current = globalCarouselIndex;
      const nextIndex = globalCarouselIndex % filteredImages.length;
      
      // Trigger transition to the new index
      transitionToImage(nextIndex);
    }
  }, [globalCarouselIndex, filteredImages]);

  // Effect for auto-advancing the carousel
  useEffect(() => {
    if (autoAdvance && filteredImages.length > 1) {
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Set up new timer for auto-advance
      timerRef.current = setTimeout(() => {
        advanceToNextImage();
      }, carouselTimer * 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [autoAdvance, currentIndex, carouselTimer, filteredImages.length]);

  const transitionToImage = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= filteredImages.length) return;
    if (nextIndex === currentIndex) return;

    const nextImage = filteredImages[nextIndex];
    if (!nextImage) return;

    // Preload the next image
    const preloadImage = new Image();
    preloadImage.src = nextImage;

    preloadImage.onload = () => {
      setTransitionImage(nextImage);
      setIsTransitioning(false);

      // Use requestAnimationFrame to ensure proper animation timing
      requestAnimationFrame(() => {
        setIsTransitioning(true);

        // Complete transition after animation duration
        const timeout = setTimeout(() => {
          setVisibleImage(nextImage);
          setCurrentIndex(nextIndex);
          setTransitionImage(null);
          setIsTransitioning(false);
        }, 2000); // Match CSS transition duration

        return () => clearTimeout(timeout);
      });
    };

    preloadImage.onerror = (error) => {
      console.error("Failed to load image:", nextImage, error);
      // Move to the next image even if there's an error
      setVisibleImage(nextImage);
      setCurrentIndex(nextIndex);
    };
  };

  const advanceToNextImage = () => {
    if (filteredImages.length <= 1) return;
    const nextIndex = (currentIndex + 1) % filteredImages.length;
    transitionToImage(nextIndex);
  };

  const selectSpecificImage = (index: number) => {
    if (index < 0 || index >= filteredImages.length) return;
    transitionToImage(index);
  };

  return {
    visibleImage,
    transitionImage,
    isTransitioning,
    currentIndex,
    advanceToNextImage,
    selectSpecificImage
  };
};
