
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
  const filteredImages = Array.isArray(images) 
    ? images.filter(img => !!img) 
    : [];
    
  const [visibleImage, setVisibleImage] = useState<string | null>(
    filteredImages.length > 0 ? filteredImages[0] : null
  );
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousImages, setPreviousImages] = useState<string[]>([]);
  const [previousIndex, setPreviousIndex] = useState(globalCarouselIndex);

  // Initialize or update visible image when images array changes
  useEffect(() => {
    if (filteredImages.length > 0) {
      // Check if images array has changed
      const imagesChanged = 
        filteredImages.length !== previousImages.length || 
        filteredImages.some((img, i) => previousImages[i] !== img);
      
      if (imagesChanged) {
        setPreviousImages(filteredImages);
        
        // Set the initial visible image based on the globalCarouselIndex
        const initialIndex = Math.min(globalCarouselIndex, filteredImages.length - 1);
        setVisibleImage(filteredImages[initialIndex >= 0 ? initialIndex : 0]);
        
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
  }, [filteredImages, globalCarouselIndex]);

  // Handle image transitions based on the globalCarouselIndex
  useEffect(() => {
    if (!filteredImages.length) return;
    
    // Only proceed if the index has changed
    if (globalCarouselIndex === previousIndex) return;
    setPreviousIndex(globalCarouselIndex);
    
    const nextIndex = Math.min(globalCarouselIndex, filteredImages.length - 1);
    if (nextIndex < 0 || nextIndex >= filteredImages.length) return;
    
    const next = filteredImages[nextIndex];
    if (!next) return;
    
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
  }, [globalCarouselIndex, filteredImages, visibleImage, previousIndex]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
