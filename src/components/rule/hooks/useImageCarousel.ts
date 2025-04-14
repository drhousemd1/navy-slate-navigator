
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
  // Filter out empty images and ensure we only have strings
  const filteredImages = images.filter((img): img is string => 
    typeof img === 'string' && img.trim() !== '');
  
  // Set up state for image management
  const [visibleImage, setVisibleImage] = useState<string | null>(
    filteredImages.length > 0 ? filteredImages[0] : null
  );
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevGlobalIndexRef = useRef(globalCarouselIndex);
  const imagesRef = useRef<string[]>(filteredImages);

  // Debug logging
  useEffect(() => {
    console.log("useImageCarousel - Available images:", filteredImages);
    console.log("useImageCarousel - Current visible image:", 
      visibleImage ? (visibleImage.substring(0, 100) + '...') : 'null');
    console.log("useImageCarousel - Current globalCarouselIndex:", globalCarouselIndex);
    console.log("useImageCarousel - Previous globalCarouselIndex:", prevGlobalIndexRef.current);
  }, [filteredImages, visibleImage, globalCarouselIndex]);

  // Update the images reference when filteredImages changes
  useEffect(() => {
    if (JSON.stringify(filteredImages) !== JSON.stringify(imagesRef.current)) {
      console.log("Images array changed, updating reference");
      imagesRef.current = filteredImages;
      
      // If we have images but no visible image yet, set the first one
      if (filteredImages.length > 0 && !visibleImage) {
        console.log("Setting initial visible image");
        setVisibleImage(filteredImages[0]);
      }
    }
  }, [filteredImages, visibleImage]);

  // Handle image transition when globalCarouselIndex changes
  useEffect(() => {
    if (filteredImages.length === 0) {
      console.log("No images available to display");
      return;
    }
    
    if (filteredImages.length === 1) {
      // If only one image, just make sure it's set as visible
      if (visibleImage !== filteredImages[0]) {
        console.log("Single image available, setting as visible:", 
          filteredImages[0].substring(0, 100) + '...');
        setVisibleImage(filteredImages[0]);
      }
      return;
    }
    
    // Skip if global index hasn't changed
    if (globalCarouselIndex === prevGlobalIndexRef.current) {
      console.log("Global carousel index unchanged, skipping transition");
      return;
    }

    console.log("Carousel index changed from", prevGlobalIndexRef.current, "to", globalCarouselIndex);
    prevGlobalIndexRef.current = globalCarouselIndex;

    // Find current image index
    let currentIndex = filteredImages.indexOf(visibleImage || '');
    if (currentIndex < 0) {
      console.log("Current image not found in filtered images array, defaulting to index 0");
      currentIndex = 0;
    }
    
    // Calculate next image index
    const nextIndex = (currentIndex + 1) % filteredImages.length;
    const nextImage = filteredImages[nextIndex];
    
    console.log(`Transitioning from index ${currentIndex} to ${nextIndex}`);
    console.log(`Next image: ${nextImage.substring(0, 100)}...`);

    // Preload the next image
    const preloadImage = new Image();
    preloadImage.src = nextImage;

    preloadImage.onload = () => {
      console.log("Image preloaded successfully:", nextImage.substring(0, 100) + '...');
      // Set up transition
      setTransitionImage(nextImage);

      // Use requestAnimationFrame to ensure DOM updates before starting animation
      requestAnimationFrame(() => {
        setIsTransitioning(true);
        console.log("Starting transition animation");

        const timeout = setTimeout(() => {
          setVisibleImage(nextImage);
          setTransitionImage(null);
          setIsTransitioning(false);
          console.log("Transition complete, new visible image:", nextImage.substring(0, 100) + '...');
        }, 2000); // Match the CSS transition duration

        return () => clearTimeout(timeout);
      });
    };

    preloadImage.onerror = (error) => {
      console.error("Failed to load image:", nextImage.substring(0, 100) + '...');
      console.error("Image load error:", error);
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
