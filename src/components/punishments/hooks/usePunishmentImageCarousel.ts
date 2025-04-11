import { useEffect, useState } from 'react';

interface UsePunishmentImageCarouselProps {
  images: string[];
  globalCarouselIndex: number;
}

interface UsePunishmentImageCarouselResult {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
}

export const usePunishmentImageCarousel = ({
  images,
  globalCarouselIndex
}: UsePunishmentImageCarouselProps): UsePunishmentImageCarouselResult => {
  const [visibleImage, setVisibleImage] = useState<string | null>(null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousImages, setPreviousImages] = useState<string[]>([]);

  // Handle image list changes
  useEffect(() => {
    const changed =
      images.length !== previousImages.length ||
      images.some((img, i) => previousImages[i] !== img);

    if (changed) {
      setPreviousImages(images);

      // Only set a new visibleImage if one is not set or missing
      if ((!visibleImage || !images.includes(visibleImage)) && images.length > 0) {
        setVisibleImage(images[0]);
        setTransitionImage(null);
        setIsTransitioning(false);
      }
    }
  }, [images, visibleImage]);

  // Rotate images by external index
  useEffect(() => {
    if (!images.length || images.length <= 1) return;

    const nextIndex = globalCarouselIndex % images.length;
    const next = images[nextIndex];

    const preload = new Image();
    preload.src = next;

    preload.onload = () => {
      setTransitionImage(next);

      requestAnimationFrame(() => {
        setTimeout(() => {
          setIsTransitioning(true);

          const fadeTimeout = setTimeout(() => {
            setVisibleImage(next);
            setTransitionImage(null);
            setIsTransitioning(false);
          }, 2000);

          return () => clearTimeout(fadeTimeout);
        }, 100); // Allow rendering before starting fade
      });
    };

    preload.onerror = () => {
      console.error("Failed to load image:", next);
      setVisibleImage(next);
    };
  }, [globalCarouselIndex, images]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};