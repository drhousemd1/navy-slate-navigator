
import { useState, useEffect } from 'react';

interface UsePunishmentImageCarouselProps {
  images: (string | null)[];
  carouselTimer?: number;
}

interface UsePunishmentImageCarouselResult {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
  currentImageIndex: number;
}

export const usePunishmentImageCarousel = ({ 
  images, 
  carouselTimer = 5 
}: UsePunishmentImageCarouselProps): UsePunishmentImageCarouselResult => {
  // Filter out null images to create a clean array of valid images
  const validImages = images.filter(img => img !== null) as string[];
  
  const [visibleImage, setVisibleImage] = useState<string | null>(
    validImages.length > 0 ? validImages[0] : null
  );
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  // Handle initial image setup when images array changes
  useEffect(() => {
    if (validImages.length > 0) {
      // Check if images array has changed
      const firstValidImage = validImages[0];
      
      if (firstValidImage && visibleImage !== firstValidImage) {
        setVisibleImage(firstValidImage);
        setTransitionImage(null);
        setIsTransitioning(false);
        setCurrentImageIndex(0);
        setLastUpdateTime(Date.now());
      }
    } else if (visibleImage !== null) {
      // Reset if we had images but now don't
      setVisibleImage(null);
      setTransitionImage(null);
      setIsTransitioning(false);
      setCurrentImageIndex(0);
    }
  }, [validImages, visibleImage]);

  // Handle image transitions 
  useEffect(() => {
    if (!validImages.length || validImages.length <= 1) {
      return;
    }

    // Calculate if it's time for a transition
    const intervalId = setInterval(() => {
      const now = Date.now();
      if (now - lastUpdateTime >= carouselTimer * 1000) {
        const nextIndex = (currentImageIndex + 1) % validImages.length;
        const next = validImages[nextIndex];
        
        if (next === visibleImage) return;
        
        // Start transition
        const preload = new Image();
        preload.src = next;
        
        preload.onload = () => {
          setTransitionImage(next);
          setIsTransitioning(false);
          
          requestAnimationFrame(() => {
            setTimeout(() => {
              setIsTransitioning(true);
              
              const timeout = setTimeout(() => {
                setVisibleImage(next);
                setTransitionImage(null);
                setIsTransitioning(false);
                setCurrentImageIndex(nextIndex);
                setLastUpdateTime(Date.now());
              }, 2000);
              
              return () => clearTimeout(timeout);
            }, 0);
          });
        };
        
        preload.onerror = () => {
          console.error("Failed to load image:", next);
          // Try to continue with the next image anyway
          setCurrentImageIndex(nextIndex);
          setLastUpdateTime(Date.now());
        };
      }
    }, 500); // Check every half second
    
    return () => clearInterval(intervalId);
  }, [validImages, currentImageIndex, visibleImage, carouselTimer, lastUpdateTime]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning,
    currentImageIndex
  };
};
