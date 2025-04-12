
import React from 'react';
import { useImageCarousel } from '@/components/hooks/useImageCarousel';

interface TaskBackgroundCarouselProps {
  backgroundImages?: (string | null)[] | null;
  backgroundImageUrl?: string;
  carouselTimer?: number;
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
  globalCarouselIndex?: number;
}

const TaskBackgroundCarousel: React.FC<TaskBackgroundCarouselProps> = ({
  backgroundImages = [],
  backgroundImageUrl,
  carouselTimer = 5,
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
  globalCarouselIndex = 0
}) => {
  const allImages: (string | null)[] =
    backgroundImages && backgroundImages.length > 0
      ? backgroundImages
      : backgroundImageUrl
      ? [backgroundImageUrl]
      : [];
  
  const filteredImages = allImages.filter((img): img is string => !!img);

  const {
    visibleImage,
    transitionImage,
    isTransitioning
  } = useImageCarousel({
    images: filteredImages,
    globalCarouselIndex
  });

  return (
    <>
      {visibleImage && (
        <img
          src={visibleImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: backgroundOpacity / 100,
            transition: 'opacity 2s ease-in-out'
          }}
          aria-hidden="true"
          draggable={false}
        />
      )}

      {transitionImage && (
        <img
          src={transitionImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
          style={{
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: isTransitioning ? backgroundOpacity / 100 : 0,
            transition: 'opacity 2s ease-in-out'
          }}
          aria-hidden="true"
          draggable={false}
        />
      )}
    </>
  );
};

export default TaskBackgroundCarousel;
