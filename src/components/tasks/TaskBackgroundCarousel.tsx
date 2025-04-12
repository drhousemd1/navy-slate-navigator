
import React from 'react';
import { useImageCarousel } from '@/components/hooks/useImageCarousel';

const TaskBackgroundCarousel = ({
  backgroundImages = [],
  backgroundImageUrl,
  carouselTimer = 5,
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
  globalCarouselIndex = 0
}) => {
  const allImages =
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
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {!visibleImage && !transitionImage && (
        <div 
          className="absolute inset-0 w-full h-full bg-[#0f172a]"
          aria-hidden="true"
        />
      )}

      {visibleImage && (
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            zIndex: 0,
            backgroundImage: `url(${visibleImage})`,
            backgroundSize: 'cover',
            backgroundPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: backgroundOpacity / 100,
            transition: 'opacity 0.5s ease-in-out'
          }}
          aria-hidden="true"
        />
      )}

      {transitionImage && (
        <div
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            zIndex: 1,
            backgroundImage: `url(${transitionImage})`,
            backgroundSize: 'cover',
            backgroundPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: isTransitioning ? backgroundOpacity / 100 : 0,
            transition: 'opacity 2s ease-in-out'
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default TaskBackgroundCarousel;
