
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
    if (!images.length) return;
    
    // For single image, ensure it's set as visible but don't do transitions
    if (images.length === 1) {
      if (visibleImage !== images[0]) {
        setVisibleImage(images[0]);
      }
      return;
    }
    
    const nextIndex = globalCarouselIndex % images.length;
    const next = images[nextIndex];
    
    if (next === visibleImage) return;
    
    try {
      const preload = new Image();
      preload.src = next;
      
      preload.onload = () => {
        setTransitionImage(next);
        setIsTransitioning(false);
        
        // Use a safer approach for animation frames
        setTimeout(() => {
          setIsTransitioning(true);
          
          const timeout = setTimeout(() => {
            setVisibleImage(next);
            setTransitionImage(null);
            setIsTransitioning(false);
          }, 1000); // Reduced to 1 second for stability
          
          return () => clearTimeout(timeout);
        }, 50);
      };
      
      preload.onerror = () => {
        console.error("Failed to load image:", next);
        // Try to continue with the next image anyway
        setVisibleImage(next);
      };
    } catch (error) {
      console.error("Error during image transition:", error);
      // Fallback to direct update without transition
      setVisibleImage(next);
    }
  }, [globalCarouselIndex, images, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
