
import { useState, useEffect } from 'react';
import { useRuleCarousel } from '@/components/carousel/RuleCarouselContext';

interface UseRuleImageCarouselProps {
  images: string[];
}

export const useRuleImageCarousel = ({ images }: UseRuleImageCarouselProps) => {
  const [visibleImage, setVisibleImage] = useState<string | null>(images?.[0] ?? null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousImages, setPreviousImages] = useState<string[]>([]);
  const { timer, resyncFlag } = useRuleCarousel();

  useEffect(() => {
    const imagesChanged =
      images.length !== previousImages.length ||
      images.some((img, i) => previousImages[i] !== img);

    if (imagesChanged) {
      setVisibleImage(images[0] ?? null);
      setPreviousImages(images);
      setCurrentIndex(0);
      return;
    }

    if (!images || images.length === 0) {
      setVisibleImage(null);
      return;
    }
  }, [images, previousImages]);

  useEffect(() => {
    if (!images || images.length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % images.length;
      const nextImage = images[nextIndex];

      if (nextImage === visibleImage) return;

      setTransitionImage(nextImage);
      setIsTransitioning(true);

      setTimeout(() => {
        setVisibleImage(nextImage);
        setIsTransitioning(false);
        setTransitionImage(null);
        setCurrentIndex(nextIndex);
      }, 1000);
    }, timer * 1000);

    return () => clearInterval(interval);
  }, [currentIndex, images, timer, visibleImage, resyncFlag]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
