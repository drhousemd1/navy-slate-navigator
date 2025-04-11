
import { useEffect, useState } from 'react';

interface UsePunishmentImageCarouselProps {
  images: (string | null)[];
  carouselTimer?: number;
}

interface UsePunishmentImageCarouselResult {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
}

export const usePunishmentImageCarousel = ({
  images,
  carouselTimer = 5
}: UsePunishmentImageCarouselProps): UsePunishmentImageCarouselResult => {
  const filteredImages = images.filter((img): img is string => !!img);
  const [visibleImage, setVisibleImage] = useState<string | null>(filteredImages.length > 0 ? filteredImages[0] : null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Effect to change images at the specified interval
  useEffect(() => {
    if (filteredImages.length <= 1) return;
    
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % filteredImages.length;
      setCurrentIndex(nextIndex);
    }, carouselTimer * 1000);
    
    return () => clearInterval(interval);
  }, [currentIndex, filteredImages.length, carouselTimer]);

  // Effect to handle the transition between images
  useEffect(() => {
    if (filteredImages.length <= 1) return;
    
    const nextImage = filteredImages[currentIndex];
    if (nextImage === visibleImage) return;

    // Preload the next image
    const preloadImage = new Image();
    preloadImage.src = nextImage;
    
    preloadImage.onload = () => {
      setTransitionImage(nextImage);
      requestAnimationFrame(() => {
        setIsTransitioning(true);

        // After transition completes, update the visible image
        const timeout = setTimeout(() => {
          setVisibleImage(nextImage);
          setTransitionImage(null);
          setIsTransitioning(false);
        }, 2000); // Match the transition duration

        return () => clearTimeout(timeout);
      });
    };

    preloadImage.onerror = () => {
      console.error("Failed to load image:", nextImage);
      // If image fails to load, still update to prevent getting stuck
      setVisibleImage(nextImage);
    };
  }, [currentIndex, filteredImages]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
