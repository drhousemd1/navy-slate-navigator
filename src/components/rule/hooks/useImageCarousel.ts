
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
  const filteredImages = images.filter(img => !!img);
  const [visibleImage, setVisibleImage] = useState<string | null>(
    filteredImages.length > 0 ? filteredImages[0] : null
  );
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousImages, setPreviousImages] = useState<string[]>([]);

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

  // Handle image transitions based on the globalCarouselIndex
  useEffect(() => {
    if (!filteredImages.length || filteredImages.length <= 1) return;
    
    const nextIndex = globalCarouselIndex % filteredImages.length;
    const next = filteredImages[nextIndex];
    
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
          }, 2000); // Match the transition duration
          
          return () => clearTimeout(timeout);
        }, 0);
      });
    };
    
    preload.onerror = () => {
      console.error("Failed to load image:", next);
      setVisibleImage(next);
    };
  }, [globalCarouselIndex, filteredImages, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
