
import { useState, useEffect } from 'react';

interface UseRuleImageCarouselProps {
  images: string[];
  globalCarouselIndex: number;
}

export const useRuleImageCarousel = ({
  images,
  globalCarouselIndex
}: UseRuleImageCarouselProps) => {
  const [visibleImage, setVisibleImage] = useState<string | null>(images?.[0] ?? null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousImages, setPreviousImages] = useState<string[]>([]);

  useEffect(() => {
    const imagesChanged =
      images.length !== previousImages.length ||
      images.some((img, i) => previousImages[i] !== img);

    if (imagesChanged) {
      setVisibleImage(images[0] ?? null);
      setPreviousImages(images);
      return;
    }

    if (!images || images.length === 0) {
      setVisibleImage(null);
      return;
    }

    const nextIndex = globalCarouselIndex % images.length;
    const nextImage = images[nextIndex];

    if (nextImage === visibleImage) return;

    setTransitionImage(nextImage);
    setIsTransitioning(true);

    const timeout = setTimeout(() => {
      setVisibleImage(nextImage);
      setIsTransitioning(false);
      setTransitionImage(null);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [globalCarouselIndex, images, previousImages, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
