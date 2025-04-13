
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
  const [visibleImage, setVisibleImage] = useState<string | null>(images[0] || null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousImagesRef = useRef<string[]>([]);
  const transitionTimeoutRef = useRef<number | null>(null);
  
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
    // Clear existing timeout to prevent memory leaks
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    
    if (!images.length || images.length <= 1) {
      return;
    }
    
    const nextIndex = globalCarouselIndex % images.length;
    const next = images[nextIndex];
    
    if (!next || next === visibleImage) {
      return; // Skip if same image or undefined
    }
    
    // Set up transition
    setTransitionImage(next);
    setIsTransitioning(true);
    
    // After transition completes, update the visible image
    transitionTimeoutRef.current = window.setTimeout(() => {
      setVisibleImage(next);
      setTransitionImage(null);
      setIsTransitioning(false);
    }, 2000); // 2 seconds, matching CSS transition
    
    // Clear timeout on component unmount or before next effect runs
    return () => {
      if (transitionTimeoutRef.current) {
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

export default useRuleImageCarousel;
