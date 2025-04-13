
import { useState, useEffect } from "react";

interface UseImageCarouselProps {
  images: string[];
  globalCarouselIndex: number;
}

interface UseImageCarouselResult {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  nextImage: () => void;
  prevImage: () => void;
}

export const useImageCarousel = ({
  images,
  globalCarouselIndex
}: UseImageCarouselProps): UseImageCarouselResult => {
  const [visibleImage, setVisibleImage] = useState<string | null>(images.length > 0 ? images[0] : null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(globalCarouselIndex);

  useEffect(() => {
    if (images.length === 0) return;

    const newIndex = globalCarouselIndex % images.length;
    if (images[newIndex] !== visibleImage) {
      setTransitionImage(visibleImage);
      setVisibleImage(images[newIndex]);
      setIsTransitioning(true);

      const timer = setTimeout(() => {
        setTransitionImage(null);
        setIsTransitioning(false);
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [globalCarouselIndex, images]);

  const nextImage = () => {
    const nextIndex = (currentIndex + 1) % images.length;
    setCurrentIndex(nextIndex);
  };

  const prevImage = () => {
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    setCurrentIndex(prevIndex);
  };

  return {
    visibleImage,
    transitionImage,
    isTransitioning,
    currentIndex,
    setCurrentIndex,
    nextImage,
    prevImage
  };
};
