
import { useEffect, useState, useRef } from 'react';

interface UsePunishmentImageCarouselProps {
  images: (string | null)[];
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
  const filteredImages = images.filter((img): img is string => !!img);
  const [visibleImage, setVisibleImage] = useState<string | null>(filteredImages.length > 0 ? filteredImages[0] : null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevGlobalIndexRef = useRef(globalCarouselIndex);

  // Effect to handle the transition between images when globalCarouselIndex changes
  useEffect(() => {
    if (filteredImages.length <= 1) return;
    if (globalCarouselIndex === prevGlobalIndexRef.current) return;
    
    prevGlobalIndexRef.current = globalCarouselIndex;
    
    const currentIndex = filteredImages.indexOf(visibleImage || filteredImages[0]);
    const nextIndex = (currentIndex + 1) % filteredImages.length;
    const nextImage = filteredImages[nextIndex];
    
    if (nextImage === visibleImage) return;

    // Preload the next image
    const preloadImage = new Image();
    preloadImage.src = nextImage;
    
    preloadImage.onload = () => {
      setTransitionImage(nextImage);
      
      // Use requestAnimationFrame for smoother transition
      requestAnimationFrame(() => {
        setIsTransitioning(true);

        // After transition completes, update the visible image
        const timeout = setTimeout(() => {
          setVisibleImage(nextImage);
          setTransitionImage(null);
          setIsTransitioning(false);
        }, 2000); // Match the transition duration in CSS

        return () => clearTimeout(timeout);
      });
    };

    preloadImage.onerror = () => {
      console.error("Failed to load image:", nextImage);
      // If image fails to load, still update to prevent getting stuck
      setVisibleImage(nextImage);
    };
  }, [globalCarouselIndex, filteredImages, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
