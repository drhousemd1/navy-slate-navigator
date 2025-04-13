
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
  const [visibleImage, setVisibleImage] = useState<string | null>(images.length > 0 ? images[0] : null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousImages, setPreviousImages] = useState<string[]>([]);
  
  // Store the last index to prevent unnecessary transitions
  const lastIndexRef = useRef<number>(0);

  // Initialize or update visible image when images array changes
  useEffect(() => {
    if (!images.length) {
      setVisibleImage(null);
      setTransitionImage(null);
      setIsTransitioning(false);
      setPreviousImages([]);
      return;
    }
    
    const imagesChanged = 
      images.length !== previousImages.length || 
      images.some((img, i) => previousImages[i] !== img);
    
    if (imagesChanged) {
      setPreviousImages([...images]);
      if (images.length > 0) {
        setVisibleImage(images[0]);
        setTransitionImage(null);
        setIsTransitioning(false);
      }
    }
  }, [images, previousImages]);

  // Handle image transitions based on globalCarouselIndex
  useEffect(() => {
    if (!images.length || images.length <= 1) {
      return;
    }
    
    // Prevent unnecessary transitions if the index hasn't changed
    if (globalCarouselIndex === lastIndexRef.current) {
      return;
    }
    
    lastIndexRef.current = globalCarouselIndex;
    
    const currentIndex = globalCarouselIndex % images.length;
    const nextIndex = (currentIndex + 1) % images.length;
    
    const currentImage = images[currentIndex];
    const nextImage = images[nextIndex];
    
    if (!currentImage || currentImage === visibleImage) {
      return;
    }
    
    // Preload the next image to ensure smooth transition
    const preloadImage = new Image();
    preloadImage.src = currentImage;
    
    preloadImage.onload = () => {
      setTransitionImage(currentImage);
      setIsTransitioning(false);
      
      // Use requestAnimationFrame to ensure the browser has painted before starting transition
      requestAnimationFrame(() => {
        // Small timeout to ensure the browser has time to process the opacity change
        setTimeout(() => {
          setIsTransitioning(true);
          
          // After transition completes, update the visible image
          const transitionDuration = 2000; // 2 seconds, matching CSS transition
          setTimeout(() => {
            setVisibleImage(currentImage);
            setTransitionImage(null);
            setIsTransitioning(false);
          }, transitionDuration);
        }, 50);
      });
    };
    
    preloadImage.onerror = () => {
      console.error("Failed to load image:", currentImage);
      // Still update the visible image even if preloading fails
      setVisibleImage(currentImage);
    };
  }, [globalCarouselIndex, images, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};

export default useRuleImageCarousel;
