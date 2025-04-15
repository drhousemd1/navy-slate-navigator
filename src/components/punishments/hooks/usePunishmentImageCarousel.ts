
import { useState, useEffect } from 'react';

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
  const [previousImages, setPreviousImages] = useState<string[]>([]);
  
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
      }
    } else if (previousImages.length > 0 && images.length === 0) {
      // Reset if we had images but now don't
      setPreviousImages([]);
      setVisibleImage(null);
      setTransitionImage(null);
      setIsTransitioning(false);
    }
  }, [images]);

  // Handle image transitions when global carousel index changes
  useEffect(() => {
    // Don't perform transitions if we have no images or just one image
    if (!images.length || images.length === 1) {
      if (images.length === 1 && visibleImage !== images[0]) {
        setVisibleImage(images[0]);
      }
      return;
    }
    
    const nextIndex = globalCarouselIndex % images.length;
    const next = images[nextIndex];
    
    if (next === visibleImage) return;
    
    // Preload the next image
    const preload = new Image();
    preload.src = next;
    
    const handleLoad = () => {
      setTransitionImage(next);
      setIsTransitioning(false);
      
      // Use requestAnimationFrame for smoother transitions
      requestAnimationFrame(() => {
        setTimeout(() => {
          setIsTransitioning(true);
          
          // Apply the transition effect duration
          const transitionDuration = 2000; // 2 seconds for transition
          
          const timeout = setTimeout(() => {
            setVisibleImage(next);
            setTransitionImage(null);
            setIsTransitioning(false);
          }, transitionDuration);
          
          return () => clearTimeout(timeout);
        }, 0);
      });
    };
    
    const handleError = () => {
      console.error("Failed to load image:", next);
      // Try to continue with the next image anyway
      setVisibleImage(next);
    };
    
    preload.onload = handleLoad;
    preload.onerror = handleError;
    
    // Clean up in case component unmounts before image loads
    return () => {
      preload.onload = null;
      preload.onerror = null;
    };
  }, [globalCarouselIndex, images, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
