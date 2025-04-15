
import { useState, useEffect, useRef } from 'react';

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
  const [previousImages, setPreviousImages] = useState<string[]>([]);
  const transitionTimerRef = useRef<number | null>(null);
  const preloadedImages = useRef<Set<string>>(new Set());

  // Clear transition timer when component unmounts
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  // Initialize or update visible image when images array changes
  useEffect(() => {
    if (images.length > 0) {
      // Check if images array has changed
      const imagesChanged = 
        images.length !== previousImages.length || 
        images.some((img, i) => previousImages[i] !== img);
      
      if (imagesChanged) {
        setPreviousImages(images);
        setVisibleImage(images[0]);
        setTransitionImage(null);
        setIsTransitioning(false);
        
        // Preload all images in the array
        images.forEach(img => {
          if (img && !preloadedImages.current.has(img)) {
            const preloadImg = new Image();
            preloadImg.src = img;
            preloadedImages.current.add(img);
          }
        });
      }
    } else if (previousImages.length > 0 && images.length === 0) {
      // Reset if we had images but now don't
      setPreviousImages([]);
      setVisibleImage(null);
      setTransitionImage(null);
      setIsTransitioning(false);
      preloadedImages.current.clear();
    }
  }, [images]);

  // Handle image transitions when global carousel index changes
  useEffect(() => {
    if (!images.length || images.length <= 1) return;
    
    const nextIndex = globalCarouselIndex % images.length;
    const next = images[nextIndex];
    
    // Skip if trying to transition to the same image
    if (next === visibleImage) return;
    
    // Clear any existing transition timer
    if (transitionTimerRef.current !== null) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    
    // Start new transition
    setTransitionImage(next);
    setIsTransitioning(false);
    
    // Use requestAnimationFrame for smoother transitions
    requestAnimationFrame(() => {
      // Short delay before starting transition
      setTimeout(() => {
        setIsTransitioning(true);
        
        // Complete transition after animation
        transitionTimerRef.current = window.setTimeout(() => {
          setVisibleImage(next);
          setTransitionImage(null);
          setIsTransitioning(false);
          transitionTimerRef.current = null;
        }, 2000) as unknown as number; // Changed back to 2000ms
      }, 50);
    });
  }, [globalCarouselIndex, images, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
