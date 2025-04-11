import { useState, useEffect, useRef } from 'react';

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
  const [visibleImage, setVisibleImage] = useState<string | null>(null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const validImages = images.filter((img): img is string => !!img);

  useEffect(() => {
    if (validImages.length === 0) return;

    // Start with the first image
    setVisibleImage(validImages[0]);
    setCurrentImageIndex(0);

    if (validImages.length === 1) return;

    timerRef.current = setInterval(() => {
      const nextIndex = (currentImageIndex + 1) % validImages.length;
      const next = validImages[nextIndex];

      // Initiate transition phase
      setTransitionImage(next);
      setIsTransitioning(true);

      // After the fade completes, commit image and clean up
      transitionTimeoutRef.current = setTimeout(() => {
        setVisibleImage(next);
        setTransitionImage(null);
        setIsTransitioning(false);
        setCurrentImageIndex(nextIndex);
      }, 2000); // Match fade timing
    }, carouselTimer * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, [validImages.join(','), carouselTimer]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning,
    currentImageIndex
  };
};