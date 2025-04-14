
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
  // Filter out empty images and ensure we only have strings
  const filteredImages = images.filter((img): img is string => 
    typeof img === 'string' && img.trim() !== '');
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleImage, setVisibleImage] = useState<string | null>(
    filteredImages.length > 0 ? filteredImages[0] : null
  );
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Update visible image when globalCarouselIndex changes
  useEffect(() => {
    if (filteredImages.length === 0) {
      setVisibleImage(null);
      setTransitionImage(null);
      return;
    }
    
    if (filteredImages.length === 1) {
      setVisibleImage(filteredImages[0]);
      setTransitionImage(null);
      return;
    }
    
    // Calculate the next index based on the global index
    const nextIndex = globalCarouselIndex % filteredImages.length;
    
    // No need to transition if we're already showing this image
    if (nextIndex === currentIndex) return;
    
    setCurrentIndex(nextIndex);
    const nextImage = filteredImages[nextIndex];
    
    // Preload the next image
    const preloadImage = new Image();
    preloadImage.src = nextImage;
    
    preloadImage.onload = () => {
      // Set up transition
      setTransitionImage(nextImage);
      
      // Use requestAnimationFrame to ensure DOM updates before starting animation
      requestAnimationFrame(() => {
        setIsTransitioning(true);
        
        const timeout = setTimeout(() => {
          setVisibleImage(nextImage);
          setTransitionImage(null);
          setIsTransitioning(false);
        }, 2000); // Match the CSS transition duration
        
        return () => clearTimeout(timeout);
      });
    };
    
    preloadImage.onerror = () => {
      // Even on error, try to display the image
      console.error("Failed to preload image:", nextImage);
      setVisibleImage(nextImage);
    };
  }, [globalCarouselIndex, filteredImages, currentIndex]);
  
  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
