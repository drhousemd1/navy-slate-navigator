
import { useState, useEffect } from 'react';

interface UseImageCarouselProps {
  images: string[];
  globalCarouselIndex: number;
}

interface UseImageCarouselResult {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
}

export const useImageCarousel = ({ 
  images, 
  globalCarouselIndex 
}: UseImageCarouselProps): UseImageCarouselResult => {
  const [visibleImage, setVisibleImage] = useState<string | null>(images.length > 0 ? images[0] : null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!images.length) {
      // Reset state when images array is empty
      setVisibleImage(null);
      setTransitionImage(null);
      setIsTransitioning(false);
      return;
    }
    
    // Filter out empty strings or invalid URLs
    const validImages = images.filter(img => !!img);
    
    // Handle case where no valid images exist but the array has entries
    if (!validImages.length) {
      setVisibleImage(null);
      setTransitionImage(null);
      return;
    }
    
    // Set initial visible image if none exists
    if (!visibleImage && validImages.length > 0) {
      setVisibleImage(validImages[0]);
      return;
    }
    
    const currentIndex = globalCarouselIndex % validImages.length;
    const next = validImages[currentIndex];
    
    // Skip if the next image is the same as current or invalid
    if (!next || next === visibleImage) return;
    
    const preload = new Image();
    preload.src = next;
    
    // Handle successful load
    preload.onload = () => {
      setTransitionImage(next);
      setIsTransitioning(false);
      
      requestAnimationFrame(() => {
        setTimeout(() => {
          setIsTransitioning(true);
          
          const timeout = setTimeout(() => {
            setVisibleImage(next);
            setTransitionImage(null);
            setIsTransitioning(false);
          }, 2000);
          
          return () => clearTimeout(timeout);
        }, 50);
      });
    };
    
    // Handle load error
    preload.onerror = () => {
      console.error(`Failed to load image: ${next}`);
      
      // If image fails to load, try the next one in sequence
      if (validImages.length > 1) {
        const nextIndex = (currentIndex + 1) % validImages.length;
        const fallbackImage = validImages[nextIndex];
        
        if (fallbackImage && fallbackImage !== next) {
          setVisibleImage(fallbackImage);
        }
      }
    };
  }, [globalCarouselIndex, images, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
