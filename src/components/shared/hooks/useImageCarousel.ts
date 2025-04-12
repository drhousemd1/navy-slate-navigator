
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
    
    // Set initial visible image if none exists
    if (!visibleImage && images.length > 0) {
      setVisibleImage(images[0]);
      return;
    }
    
    const currentIndex = globalCarouselIndex % images.length;
    const next = images[currentIndex];
    
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
      setVisibleImage(next); // Still try to display it
    };
  }, [globalCarouselIndex, images, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
