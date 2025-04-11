import { useEffect, useState } from "react";

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
  globalCarouselIndex,
}: UsePunishmentImageCarouselProps): UsePunishmentImageCarouselResult => {
  const [visibleImage, setVisibleImage] = useState<string | null>(images[0] ?? null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (images.length <= 1) return;

    const nextIndex = globalCarouselIndex % images.length;
    const next = images[nextIndex];

    // Don't transition to the same image
    if (!next || next === visibleImage) return;

    const preload = new Image();
    preload.src = next;

    preload.onload = () => {
      setTransitionImage(next);
      setIsTransitioning(true);

      const timeout = setTimeout(() => {
        setVisibleImage(next);
        setTransitionImage(null);
        setIsTransitioning(false);
      }, 2000); // match fade duration

      return () => clearTimeout(timeout);
    };

    preload.onerror = () => {
      console.error("Failed to preload image:", next);
    };
  }, [globalCarouselIndex, images]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning,
  };
};
