
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
  // Filter out empty images
  const filteredImages = images.filter(img => typeof img === 'string' && img.trim() !== '');
  
  const [visibleImage, setVisibleImage] = useState<string | null>(
    filteredImages.length > 0 ? filteredImages[0] : null
  );
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousIndex, setPreviousIndex] = useState(globalCarouselIndex);
  
  useEffect(() => {
    console.log(`useImageCarousel: Processing ${filteredImages.length} images`);
    
    if (filteredImages.length === 0) {
      console.log("No valid images to display");
      setVisibleImage(null);
      return;
    }
    
    if (filteredImages.length === 1) {
      console.log("Only one image available, setting as visible");
      setVisibleImage(filteredImages[0]);
      return;
    }
    
    // Only trigger transition when the index actually changes
    if (globalCarouselIndex !== previousIndex) {
      console.log(`Carousel index changed from ${previousIndex} to ${globalCarouselIndex}`);
      setPreviousIndex(globalCarouselIndex);
      
      // Calculate which image to show based on the global index
      const nextIndex = globalCarouselIndex % filteredImages.length;
      const nextImage = filteredImages[nextIndex];
      
      console.log(`Transitioning to image at index ${nextIndex}`);
      
      // Set up the transition
      setTransitionImage(nextImage);
      setIsTransitioning(true);
      
      // After the transition completes, update the visible image
      const timer = setTimeout(() => {
        setVisibleImage(nextImage);
        setTransitionImage(null);
        setIsTransitioning(false);
        console.log("Transition complete");
      }, 2000); // Match the transition duration in CardBackground
      
      return () => clearTimeout(timer);
    }
  }, [globalCarouselIndex, filteredImages, previousIndex]);
  
  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
