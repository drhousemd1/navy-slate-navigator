
import { useState, useEffect, useRef } from 'react';

interface UseImageCarouselProps {
  images: string[];
  globalCarouselIndex: number;
  carouselTimer?: number;
}

interface UseImageCarouselResult {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
}

export const useImageCarousel = ({ 
  images, 
  globalCarouselIndex,
  carouselTimer = 5
}: UseImageCarouselProps): UseImageCarouselResult => {
  const [visibleImage, setVisibleImage] = useState<string | null>(images.length > 0 ? images[0] : null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevGlobalIndexRef = useRef(globalCarouselIndex);
  const timerRef = useRef(carouselTimer);
  
  // Update timer ref when carousel timer changes
  useEffect(() => {
    timerRef.current = carouselTimer;
  }, [carouselTimer]);

  useEffect(() => {
    if (!images.length || !visibleImage) return;
    if (globalCarouselIndex === prevGlobalIndexRef.current) return;
    
    prevGlobalIndexRef.current = globalCarouselIndex;
    
    const next = images[globalCarouselIndex % images.length];
    if (next === visibleImage) return;
    
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
            setTransitionImage(null);
            setIsTransitioning(false);
          }, 2000); // Fixed transition duration (2 seconds)
          
          return () => clearTimeout(timeout);
        }, 0);
      });
    };
    
    preload.onerror = () => {
      console.error("Failed to load image:", next);
      setVisibleImage(next);
    };
  }, [globalCarouselIndex, images, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
