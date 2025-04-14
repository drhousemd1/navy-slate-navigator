
import { useState, useEffect, useRef } from 'react';

export const useImageCarousel = (images: string[], timer: number) => {
  const filteredImages = images.filter(img => !!img);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [visibleImage, setVisibleImage] = useState<string | null>(
    filteredImages.length > 0 ? filteredImages[0] : null
  );
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset visible image if images array changes
    if (filteredImages.length > 0) {
      setVisibleImage(filteredImages[0]);
      setCurrentImageIndex(0);
    } else {
      setVisibleImage(null);
    }
  }, [images]);

  useEffect(() => {
    // Only set up interval if we have multiple images
    if (filteredImages.length <= 1) return;
    
    const transitionToNextImage = () => {
      const nextIndex = (currentImageIndex + 1) % filteredImages.length;
      const nextImage = filteredImages[nextIndex];
      
      // Preload the next image
      const preloadImage = new Image();
      preloadImage.src = nextImage;
      
      preloadImage.onload = () => {
        setTransitionImage(nextImage);
        setIsTransitioning(true);
        
        // After transition completes, update the visible image
        const timeout = setTimeout(() => {
          setVisibleImage(nextImage);
          setCurrentImageIndex(nextIndex);
          setTransitionImage(null);
          setIsTransitioning(false);
        }, 1000); // Match the transition duration
      };
    };
    
    // Set up the interval for image transitions
    const interval = setInterval(transitionToNextImage, timer * 1000);
    intervalRef.current = interval;
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [filteredImages, timer, currentImageIndex]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
