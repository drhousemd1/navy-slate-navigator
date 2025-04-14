
import { useState, useEffect } from "react";

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

  useEffect(() => {
    if (filteredImages.length === 0) return;

    const newIndex = globalCarouselIndex % filteredImages.length;
    const nextImage = filteredImages[newIndex];

    if (nextImage !== visibleImage) {
      setTransitionImage(visibleImage);
      setVisibleImage(nextImage);
      setIsTransitioning(true);

      const timer = setTimeout(() => {
        setTransitionImage(null);
        setIsTransitioning(false);
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [globalCarouselIndex, filteredImages, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
