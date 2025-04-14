
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
  const filteredImages = images.filter((img): img is string => !!img);
  
  const [visibleImage, setVisibleImage] = useState<string | null>(
    filteredImages.length > 0 ? filteredImages[0] : null
  );
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevGlobalIndexRef = useRef(globalCarouselIndex);

  useEffect(() => {
    if (filteredImages.length <= 1) return;
    if (globalCarouselIndex === prevGlobalIndexRef.current) return;

    prevGlobalIndexRef.current = globalCarouselIndex;

    const currentIndex = filteredImages.indexOf(visibleImage || filteredImages[0]);
    const nextIndex = (currentIndex + 1) % filteredImages.length;
    const nextImage = filteredImages[nextIndex];

    // Don't return early even if nextImage is the same as visibleImage
    // This allows cycling through the same image if needed

    const preloadImage = new Image();
    preloadImage.src = nextImage;

    preloadImage.onload = () => {
      setTransitionImage(nextImage);

      // Use requestAnimationFrame to ensure the transition happens in the next frame
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
