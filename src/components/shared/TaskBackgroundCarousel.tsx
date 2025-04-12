
import React from 'react';
import { useImageCarousel } from './hooks/useImageCarousel';

interface TaskBackgroundCarouselProps {
  backgroundImages: string[];
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
  globalCarouselIndex: number;
}

const TaskBackgroundCarousel: React.FC<TaskBackgroundCarouselProps> = ({
  backgroundImages = [],
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
  globalCarouselIndex
}) => {
  const {
    visibleImage,
    transitionImage,
    isTransitioning
  } = useImageCarousel({
    images: backgroundImages,
    globalCarouselIndex
  });

  if (!visibleImage && !transitionImage) return null;

  return (
    <>
      {visibleImage && (
        <div
          className="absolute inset-0 w-full h-full z-0"
          style={{
            backgroundImage: `url(${visibleImage})`,
            backgroundSize: 'cover',
            backgroundPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: isTransitioning ? 0 : backgroundOpacity / 100,
            transition: 'opacity 1s ease-in-out'
          }}
          aria-hidden="true"
        />
      )}

      {transitionImage && (
        <div
          className="absolute inset-0 w-full h-full z-10 pointer-events-none"
          style={{
            backgroundImage: `url(${transitionImage})`,
            backgroundSize: 'cover',
            backgroundPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: isTransitioning ? backgroundOpacity / 100 : 0,
            transition: 'opacity 1s ease-in-out'
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default TaskBackgroundCarousel;
