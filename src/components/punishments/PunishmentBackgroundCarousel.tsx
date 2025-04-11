import React from 'react';
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
  const images: (string | null)[] =
    backgroundImages && backgroundImages.length > 0
      ? backgroundImages
      : backgroundImageUrl
      ? [backgroundImageUrl]
      : [];

  const {
    visibleImage,
    transitionImage,
    isTransitioning
  } = usePunishmentImageCarousel({
    images,
    carouselTimer
  });

  if (!visibleImage && !transitionImage) return null;

  return (
    <>
      {visibleImage && (
        <img
          src={visibleImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{
            opacity: backgroundOpacity / 100,
            transition: 'opacity 2s ease-in-out',
            objectPosition: `${focalPointX}% ${focalPointY}%`
          }}
          draggable={false}
          aria-hidden="true"
        />
      )}

      {transitionImage && (
        <img
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