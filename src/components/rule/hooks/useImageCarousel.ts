
import { useState, useEffect, useRef } from "react";

interface UseImageCarouselProps {
  images: string[];
  globalCarouselIndex: number;
}

export const useImageCarousel = ({
  images,
  globalCarouselIndex
}: UseImageCarouselProps) => {
  const filteredImages = images.filter(Boolean);
  const [visibleImage, setVisibleImage] = useState<string | null>(filteredImages[0] || null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevIndexRef = useRef(globalCarouselIndex);

  useEffect(() => {
    if (filteredImages.length === 0) return;
    if (filteredImages.length === 1) return;
    if (globalCarouselIndex === prevIndexRef.current) return;

    prevIndexRef.current = globalCarouselIndex;
    
    const newIndex = globalCarouselIndex % filteredImages.length;
    const nextImage = filteredImages[newIndex];
    
    // Always transition to the next image even if it's the same as current
    setTransitionImage(visibleImage);
    setVisibleImage(nextImage);
    setIsTransitioning(true);

    const timer = setTimeout(() => {
      setTransitionImage(null);
      setIsTransitioning(false);
    }, 700);

    return () => clearTimeout(timer);
  }, [globalCarouselIndex, filteredImages, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
