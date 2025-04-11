import React, { useState, useEffect } from 'react';
import { usePunishmentImageCarousel } from './hooks/usePunishmentImageCarousel';

interface PunishmentBackgroundCarouselProps {
  backgroundImages?: (string | null)[] | null;
  backgroundImageUrl?: string;
  carouselTimer?: number;
  backgroundOpacity: number;
  focalPointX: number;
  focalPointY: number;
}

const PunishmentBackgroundCarousel: React.FC<PunishmentBackgroundCarouselProps> = ({
  backgroundImages = [],
  backgroundImageUrl,
  carouselTimer = 5,
  backgroundOpacity = 50,
  focalPointX = 50,
  focalPointY = 50
}) => {
  const allImages: (string | null)[] =
    backgroundImages && Array.isArray(backgroundImages) && backgroundImages.length > 0
      ? backgroundImages
      : backgroundImageUrl
      ? [backgroundImageUrl]
      : [];

  const {
    visibleImage,
    transitionImage,
    isTransitioning
  } = usePunishmentImageCarousel({
    images: allImages,
    carouselTimer
  });

  const [showTransition, setShowTransition] = useState(false);

  useEffect(() => {
    if (transitionImage) {
      setShowTransition(true);
      const cleanup = setTimeout(() => {
        setShowTransition(false);
      }, 2000);
      return () => clearTimeout(cleanup);
    }
  }, [transitionImage]);

  if (!visibleImage && !transitionImage) return null;

  return (
    <>
      {visibleImage && (
        <img
          key="visible"
          src={visibleImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{
            opacity: backgroundOpacity / 100,
            transition: 'opacity 0.2s linear',
            objectPosition: `${focalPointX}% ${focalPointY}%`
          }}
          draggable={false}
          aria-hidden="true"
        />
      )}

      {transitionImage && showTransition && (
        <img
          key="transition"
          src={transitionImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
          style={{
            opacity: backgroundOpacity / 100,
            transition: 'opacity 2s ease-in-out',
            objectPosition: `${focalPointX}% ${focalPointY}%`
          }}
          draggable={false}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default PunishmentBackgroundCarousel;