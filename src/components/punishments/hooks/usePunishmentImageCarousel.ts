
import { useState, useEffect, useRef } from 'react';

interface UsePunishmentImageCarouselProps {
  images: string[];
  carouselTimer?: number;
  globalCarouselIndex?: number;
}

interface UsePunishmentImageCarouselResult {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
}

export const usePunishmentImageCarousel = ({ 
  images, 
  carouselTimer = 5, 
  globalCarouselIndex = 0 
}: UsePunishmentImageCarouselProps): UsePunishmentImageCarouselResult => {
  const [visibleImage, setVisibleImage] = useState<string | null>(images.length > 0 ? images[0] : null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousImagesRef = useRef<string[]>([]);
  const transitionTimeoutRef = useRef<number | null>(null);
  
  // Only perform intensive operations when images actually change
  useEffect(() => {
    const previousImages = previousImagesRef.current;
    
    if (images.length > 0) {
      // Check if images array has changed by comparing lengths and contents
      const imagesChanged = 
        images.length !== previousImages.length || 
        images.some((img, i) => previousImages[i] !== img);
      
      if (imagesChanged) {
        // Save current images for future comparison
        previousImagesRef.current = [...images];
        
        // Reset state when images change
        setVisibleImage(images[0]);
        setTransitionImage(null);
        setIsTransitioning(false);
        
        // Clear any existing timeouts
        if (transitionTimeoutRef.current !== null) {
          clearTimeout(transitionTimeoutRef.current);
          transitionTimeoutRef.current = null;
        }
      }
    } else if (previousImages.length > 0 && images.length === 0) {
      // Reset if we had images but now don't
      previousImagesRef.current = [];
      setVisibleImage(null);
      setTransitionImage(null);
      setIsTransitioning(false);
      
      // Clear any existing timeouts
      if (transitionTimeoutRef.current !== null) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    }
  }, [images]);

  // Optimized transition logic based on global carousel index
  useEffect(() => {
    // Memory optimization - don't perform transitions if there are no images or just one
    if (!images.length || images.length === 1) {
      if (images.length === 1 && visibleImage !== images[0]) {
        setVisibleImage(images[0]);
      }
      return;
    }
    
    const nextIndex = globalCarouselIndex % images.length;
    const next = images[nextIndex];
    
    // Skip unnecessary transitions
    if (next === visibleImage) return;
    
    // Performance optimizations
    const performTransition = () => {
      setTransitionImage(next);
      setIsTransitioning(true);
      
      // Use a shorter transition to reduce memory usage
      const transitionDuration = 1000; // 1 second transition
      
      // Clear any previous transition timeout
      if (transitionTimeoutRef.current !== null) {
        clearTimeout(transitionTimeoutRef.current);
      }
      
      // Set new timeout and save the ID for cleanup
      transitionTimeoutRef.current = window.setTimeout(() => {
        setVisibleImage(next);
        setTransitionImage(null);
        setIsTransitioning(false);
        transitionTimeoutRef.current = null;
      }, transitionDuration);
    };
    
    // Use a lightweight approach to preload images
    performTransition();
    
    // Cleanup timeout on unmount or image change
    return () => {
      if (transitionTimeoutRef.current !== null) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, [globalCarouselIndex, images, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
