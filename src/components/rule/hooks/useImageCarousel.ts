
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
  // Make sure we're only working with valid image URLs
  const filteredImages = images.filter((img): img is string => !!img && img.trim() !== '');
  
  const [visibleImage, setVisibleImage] = useState<string | null>(
    filteredImages.length > 0 ? filteredImages[0] : null
  );
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevGlobalIndexRef = useRef(globalCarouselIndex);

  // Debug logging
  useEffect(() => {
    console.log("Available images:", filteredImages);
    console.log("Current visible image:", visibleImage);
  }, [filteredImages, visibleImage]);

  useEffect(() => {
    if (filteredImages.length === 0) {
      console.log("No images available to display");
      return;
    }
    
    if (filteredImages.length === 1) {
      // If only one image, just make sure it's set as visible
      if (visibleImage !== filteredImages[0]) {
        console.log("Single image available, setting as visible:", filteredImages[0]);
        setVisibleImage(filteredImages[0]);
      }
      return;
    }
    
    if (globalCarouselIndex === prevGlobalIndexRef.current) {
      console.log("Global carousel index unchanged, skipping transition");
      return;
    }

    console.log("Carousel index changed:", globalCarouselIndex);
    prevGlobalIndexRef.current = globalCarouselIndex;

    // Find current image index, default to 0 if not found
    const currentIndex = filteredImages.indexOf(visibleImage || '');
    const validCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    
    // Calculate next image index
    const nextIndex = (validCurrentIndex + 1) % filteredImages.length;
    const nextImage = filteredImages[nextIndex];
    
    console.log(`Transitioning from index ${validCurrentIndex} to ${nextIndex}`);
    console.log(`Next image: ${nextImage}`);

    // Preload the next image
    const preloadImage = new Image();
    preloadImage.src = nextImage;

    preloadImage.onload = () => {
      console.log("Image preloaded successfully:", nextImage);
      // Set up transition
      setTransitionImage(nextImage);

      requestAnimationFrame(() => {
        setIsTransitioning(true);
        console.log("Starting transition animation");

        const timeout = setTimeout(() => {
          setVisibleImage(nextImage);
          setTransitionImage(null);
          setIsTransitioning(false);
          console.log("Transition complete, new visible image:", nextImage);
        }, 2000); // Match the CSS transition duration

        return () => clearTimeout(timeout);
      });
    };

    preloadImage.onerror = () => {
      console.error("Failed to load image:", nextImage);
      // Even on error, try to continue with the next image
      setVisibleImage(nextImage);
    };
  }, [globalCarouselIndex, filteredImages, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
