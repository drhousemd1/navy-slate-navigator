
import { useState, useEffect, useRef } from 'react';

export const useImageCarousel = (images: string[], timer: number) => {
  const filteredImages = images.filter(img => !!img);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [visibleImage, setVisibleImage] = useState<string | null>(
    filteredImages.length > 0 ? filteredImages[0] : null
  );
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousImages, setPreviousImages] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or update visible image when images array changes
  useEffect(() => {
    if (filteredImages.length > 0) {
      // Check if images array has changed
      const imagesChanged = 
        filteredImages.length !== previousImages.length || 
        filteredImages.some((img, i) => previousImages[i] !== img);
      
      if (imagesChanged) {
        setPreviousImages(filteredImages);
        setVisibleImage(filteredImages[0]);
        setCurrentImageIndex(0);
        setTransitionImage(null);
        setIsTransitioning(false);
      }
    } else if (previousImages.length > 0 && filteredImages.length === 0) {
      // Reset if we had images but now don't
      setPreviousImages([]);
      setVisibleImage(null);
      setTransitionImage(null);
      setIsTransitioning(false);
    }
  }, [filteredImages]);

  // Handle image transitions based on the timer
  useEffect(() => {
    // Only set up interval if we have multiple images
    if (filteredImages.length <= 1) return;
    
    const transitionToNextImage = () => {
      const nextIndex = (currentImageIndex + 1) % filteredImages.length;
      const next = filteredImages[nextIndex];
      
      if (next === visibleImage) return;
      
      // Preload the next image
      const preload = new Image();
      preload.src = next;
      
      preload.onload = () => {
        setTransitionImage(next);
        setIsTransitioning(false);
        
        requestAnimationFrame(() => {
          setTimeout(() => {
            setIsTransitioning(true);
            
            const timeout = setTimeout(() => {
              setVisibleImage(next);
              setCurrentImageIndex(nextIndex);
              setTransitionImage(null);
              setIsTransitioning(false);
            }, 2000); // Match the transition duration
            
            return () => clearTimeout(timeout);
          }, 0);
        });
      };
      
      preload.onerror = () => {
        console.error("Failed to load image:", next);
        // Try to continue with the next image anyway
        setVisibleImage(next);
        setCurrentImageIndex(nextIndex);
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
  }, [filteredImages, timer, currentImageIndex, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
