import { useState, useEffect } from 'react';

interface UsePunishmentImageCarouselProps {
  images: string[];
  carouselTimer?: number;
}

interface UsePunishmentImageCarouselResult {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
}

export const usePunishmentImageCarousel = ({
  images,
  carouselTimer = 5
}: UsePunishmentImageCarouselProps): UsePunishmentImageCarouselResult => {
  const [visibleImage, setVisibleImage] = useState<string | null>(images.length > 0 ? images[0] : null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousImages, setPreviousImages] = useState<string[]>([]);
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);

  // Update global index every X seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalCarouselIndex(prev => prev + 1);
    }, carouselTimer * 1000);
    return () => clearInterval(interval);
  }, [carouselTimer]);

  // Reset if images array changes
  useEffect(() => {
    if (images.length > 0) {
      const changed = images.length !== previousImages.length || images.some((img, i) => previousImages[i] !== img);
      if (changed) {
        setPreviousImages(images);
        setVisibleImage(images[0]);
        setTransitionImage(null);
        setIsTransitioning(false);
      }
    } else if (previousImages.length > 0 && images.length === 0) {
      setPreviousImages([]);
      setVisibleImage(null);
      setTransitionImage(null);
      setIsTransitioning(false);
    }
  }, [images]);

  // Handle transitions
  useEffect(() => {
    if (!images.length || images.length <= 1) return;

    const nextIndex = globalCarouselIndex % images.length;
    const next = images[nextIndex];

    if (next === visibleImage) return;

    const preload = new Image();
    preload.src = next;

    preload.onload = () => {
      setTransitionImage(next);
      setIsTransitioning(false);

      requestAnimationFrame(() => {
        setTimeout(() => {
          setIsTransitioning(true);
          const timeout = setTimeout(() => {
            setVisibleImage(next);
            setTransitionImage(null);
            setIsTransitioning(false);
          }, 2000);
          return () => clearTimeout(timeout);
        }, 0);
      });
    };

    preload.onerror = () => {
      console.error("Failed to load image:", next);
      setVisibleImage(next);
    };
  }, [globalCarouselIndex, images, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};