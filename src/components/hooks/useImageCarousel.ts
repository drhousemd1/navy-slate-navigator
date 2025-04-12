
import { useState, useEffect, useRef } from 'react';

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
  const [visibleImage, setVisibleImage] = useState<string | null>(images.length > 0 ? images[0] : null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousImages, setPreviousImages] = useState<string[]>([]);
  const prevGlobalIndexRef = useRef(globalCarouselIndex);

  // Initialize or update visible image when images array changes
  useEffect(() => {
    if (images.length > 0) {
      // Check if images array has changed
      const imagesChanged = 
        images.length !== previousImages.length || 
        images.some((img, i) => previousImages[i] !== img);
      
      if (imagesChanged) {
        setPreviousImages(images);
        setVisibleImage(images[0]);
        setTransitionImage(null);
        setIsTransitioning(false);
        
        // Debug logging
        console.log('Images updated:', images);
      }
    } else if (previousImages.length > 0 && images.length === 0) {
      // Reset if we had images but now don't
      setPreviousImages([]);
      setVisibleImage(null);
      setTransitionImage(null);
      setIsTransitioning(false);
      
      // Debug logging
      console.log('No images available, resetting');
    }
  }, [images]);

  // Handle image transitions when global carousel index changes
  useEffect(() => {
    if (filteredImages.length <= 1) return;
    if (globalCarouselIndex === prevGlobalIndexRef.current) return;

    prevGlobalIndexRef.current = globalCarouselIndex;

    const currentIndex = filteredImages.indexOf(visibleImage || filteredImages[0]);
    const nextIndex = (currentIndex + 1) % filteredImages.length;
    const nextImage = filteredImages[nextIndex];

    if (nextImage === visibleImage) return;

    const preloadImage = new Image();
    preloadImage.src = nextImage;

    preloadImage.onload = () => {
      setTransitionImage(nextImage);

      requestAnimationFrame(() => {
        setIsTransitioning(true);

        const timeout = setTimeout(() => {
          setVisibleImage(nextImage);
          setTransitionImage(null);
          setIsTransitioning(false);
        }, 2000);

        return () => clearTimeout(timeout);
      });
    };

    preloadImage.onerror = () => {
      console.error("Failed to load image:", nextImage);
      setVisibleImage(nextImage);
    };
  }, [globalCarouselIndex, filteredImages, visibleImage]);

  const filteredImages = images.filter((img): img is string => !!img);

  return {
    visibleImage,
    transitionImage,
    isTransitioning
  };
};
