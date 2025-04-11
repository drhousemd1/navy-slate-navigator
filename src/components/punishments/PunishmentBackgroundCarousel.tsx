
import React, { useEffect, useState } from 'react';
import { usePunishmentImageCarousel } from './hooks/usePunishmentImageCarousel';

interface PunishmentBackgroundCarouselProps {
  backgroundImages?: (string | null)[] | null;
  backgroundImageUrl?: string;
  carouselTimer?: number;
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
  globalCarouselIndex?: number;
}

const PunishmentBackgroundCarousel: React.FC<PunishmentBackgroundCarouselProps> = ({
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

  const {
    visibleImage,
    transitionImage,
    isTransitioning
  } = usePunishmentImageCarousel({
    images: allImages,
    carouselTimer,
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
    </>
  );
};

export default PunishmentBackgroundCarousel;
