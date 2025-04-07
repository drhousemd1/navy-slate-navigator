
import { useEffect, useState } from 'react';

export function useImageCarousel(images: string[] = [], interval: number = 5000) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (images.length <= 1) return;

    const tick = setInterval(() => {
      const nextIndex = (currentIndex + 1) % images.length;
      setTransitionImage(images[nextIndex]);
      setIsTransitioning(true);

      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setIsTransitioning(false);
        setTransitionImage(null);
      }, 800); // transition duration
    }, interval);

    return () => clearInterval(tick);
  }, [currentIndex, images, interval]);

  return {
    visibleImage: images[currentIndex] || null,
    transitionImage,
    isTransitioning,
  };
}
