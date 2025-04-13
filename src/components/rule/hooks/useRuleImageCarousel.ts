
import { useState, useEffect, useRef } from 'react';

interface UseRuleImageCarouselProps {
  images: string[];
  globalCarouselIndex: number;
}

interface UseRuleImageCarouselResult {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
}

export const useRuleImageCarousel = ({ 
  images = [], 
  globalCarouselIndex = 0 
}: UseRuleImageCarouselProps): UseRuleImageCarouselResult => {
  const [visibleImage, setVisibleImage] = useState<string | null>(null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousImagesRef = useRef<string[]>([]);
  const transitionTimeoutRef = useRef<number | null>(null);
  const preloadTimeoutRef = useRef<number | null>(null);
  
  // Initialize or update visible image when images array changes
  useEffect(() => {
    if (!images.length) {
      setVisibleImage(null);
      setTransitionImage(null);
      setIsTransitioning(false);
      previousImagesRef.current = [];
      return;
    }
    
    const imagesChanged = 
      images.length !== previousImagesRef.current.length || 
      images.some((img, i) => previousImagesRef.current[i] !== img);
    
    if (imagesChanged) {
      previousImagesRef.current = [...images];
      if (images.length > 0) {
        setVisibleImage(images[0]);
        setTransitionImage(null);
        setIsTransitioning(false);
      }
    }
  }, [images]);

  // Handle image transitions based on globalCarouselIndex
  useEffect(() => {
    // Clear existing timeouts to prevent memory leaks
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
      preloadTimeoutRef.current = null;
    }
    
    if (!images.length || images.length <= 1) {
      return;
    }
    
    const nextIndex = globalCarouselIndex % images.length;
    const next = images[nextIndex];
    
    if (!next) {
      return; // Guard against undefined next image
    }
    
    // Preload the next image to ensure smooth transition
    const preload = new Image();
    preload.src = next;
    
    preload.onload = () => {
      setTransitionImage(next);
      setIsTransitioning(false);
      
      // Use requestAnimationFrame to ensure the browser has painted before starting transition
      requestAnimationFrame(() => {
        // Small timeout to ensure the browser has time to process the opacity change
        preloadTimeoutRef.current = window.setTimeout(() => {
          setIsTransitioning(true);
          
          // After transition completes, update the visible image
          const transitionDuration = 2000; // 2 seconds, matching CSS transition
          transitionTimeoutRef.current = window.setTimeout(() => {
            setVisibleImage(next);
            setTransitionImage(null);
            setIsTransitioning(false);
          }, transitionDuration);
        }, 50);
      });
    };
    
    preload.onerror = () => {
      console.error("Failed to load image:", next);
      // Still update the visible image even if preloading fails
      setVisibleImage(next);
    };
    
    // Clear timeouts on component unmount
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [globalCarouselIndex, images]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};

export default useRuleImageCarousel;
