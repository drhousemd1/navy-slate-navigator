
import { useEffect, useState, useRef } from 'react';

interface UseImageCarouselProps {
  images: string[];
  globalCarouselIndex: number;
  carouselTimer?: number;
}

interface UseImageCarouselResult {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
}

export const useImageCarousel = ({
  images,
  globalCarouselIndex,
  carouselTimer = 5
}: UseImageCarouselProps): UseImageCarouselResult => {
  const filteredImages = images.filter((img): img is string => !!img);
  const [visibleImage, setVisibleImage] = useState<string | null>(
    filteredImages.length > 0 ? filteredImages[0] : null
  );
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevGlobalIndexRef = useRef(globalCarouselIndex);
  const transitionDuration = 2000; // Fixed transition duration

  useEffect(() => {
    if (filteredImages.length <= 1) return;
    if (globalCarouselIndex === prevGlobalIndexRef.current) return;

    prevGlobalIndexRef.current = globalCarouselIndex;

    const currentIndex = filteredImages.indexOf(visibleImage || filteredImages[0]);
    const nextIndex = (currentIndex + 1) % filteredImages.length;
    const nextImage = filteredImages[nextIndex];

    const preloadImage = new Image();
    preloadImage.src = nextImage;

    preloadImage.onload = () => {
      setTransitionImage(nextImage);

      requestAnimationFrame(() => {
        setIsTransitioning(true);

        const timeout = setTimeout(() => {
          setVisibleImage(nextImage);
          setTransitionImage(null);
          setIsTransitioning(false);
        }, transitionDuration);

        return () => clearTimeout(timeout);
      });
    };

    preloadImage.onerror = () => {
      console.error("Failed to load image:", nextImage);
      setVisibleImage(nextImage);
    };
  }, [globalCarouselIndex, filteredImages, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
