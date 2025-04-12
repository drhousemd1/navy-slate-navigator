
import React from 'react';
import { usePunishmentImageCarousel } from '@/components/punishments/hooks/usePunishmentImageCarousel';

const TaskBackgroundCarousel = ({
  backgroundImages = [],
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
  globalCarouselIndex = 0
}) => {
  const filteredImages = backgroundImages.filter((img): img is string => !!img);
  
  const {
    visibleImage,
    transitionImage,
    isTransitioning
  } = usePunishmentImageCarousel({
    images: filteredImages,
    globalCarouselIndex
  });

  // Always render a container with a fallback color if no images
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Fallback background color if no images are present */}
      {!visibleImage && !transitionImage && (
        <div 
          className="absolute inset-0 w-full h-full z-0 bg-[#0f172a]"
          aria-hidden="true"
        />
      )}

      {visibleImage && (
        <div
          className="absolute inset-0 w-full h-full z-0"
          style={{
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
          className="absolute inset-0 w-full h-full z-10 pointer-events-none"
          style={{
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
