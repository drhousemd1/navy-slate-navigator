import { useState, useEffect } from 'react';

declare function require(path: string): string;

interface UseImageCarouselProps {
  images: string[];
  globalCarouselIndex: number;
}

interface UseImageCarouselResult {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
}

export const useImageCarousel = ({ 
  images, 
  globalCarouselIndex 
}: UseImageCarouselProps): UseImageCarouselResult => {
  const [visibleImage, setVisibleImage] = useState<string | null>(images.length > 0 ? require(images[0]) : null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousImages, setPreviousImages] = useState<string[]>([]);

  // Initialize or update visible image when images array changes
  useEffect(() => {
    if (images.length > 0) {
      // Check if images array has changed
      const imagesChanged = 
        images.length !== previousImages.length || 
        images.some((img, i) => previousImages[i] !== img);
      
      if (imagesChanged) {
        setPreviousImages(images);
        setVisibleImage(require(images[0]));
        setTransitionImage(null);
        setIsTransitioning(false);
      }
    } else if (previousImages.length > 0 && images.length === 0) {
      // Reset if we had images but now don't
      setPreviousImages([]);
      setVisibleImage(null);
      setTransitionImage(null);
      setIsTransitioning(false);
    }
  }, [images]);

  // Handle image transitions when global carousel index changes
  useEffect(() => {
    if (!images.length || images.length <= 1) return;
    
    const nextIndex = globalCarouselIndex % images.length;
    const next = images[nextIndex];
    
    if (next === visibleImage) return;
    
    const preload = new Image();
    preload.src = next;
    
    preload.onload = () => {
      setTransitionImage(require(next));
      setIsTransitioning(false);
      
      requestAnimationFrame(() => {
        setTimeout(() => {
          setIsTransitioning(true);
          
          const timeout = setTimeout(() => {
            setVisibleImage(require(next));
            setTransitionImage(null);
            setIsTransitioning(false);
          }, 2000);
          
          return () => clearTimeout(timeout);
        }, 0);
      });
    };
    
    preload.onerror = () => {
      console.error("Failed to load image:", next);
      // Try to continue with the next image anyway
      setVisibleImage(require(next));
    };
  }, [globalCarouselIndex, images, visibleImage]);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
