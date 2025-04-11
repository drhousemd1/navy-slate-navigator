
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
  const imagesArray = backgroundImages && Array.isArray(backgroundImages) ? backgroundImages : [];

  const allImages: (string | null)[] = imagesArray.length > 0 
    ? imagesArray 
    : (backgroundImageUrl ? [backgroundImageUrl] : []);

  const {
    visibleImage,
    transitionImage,
    isTransitioning
  } = usePunishmentImageCarousel({
    images: allImages,
    carouselTimer
  });

  if (!visibleImage && !transitionImage) return null;

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    opacity: backgroundOpacity / 100,
    zIndex: 0,
  };

  return (
    <>
      {visibleImage && (
        <div
          key="visible"
          style={{
            ...baseStyle,
            backgroundImage: `url(${visibleImage})`,
            backgroundPosition: `${focalPointX}% ${focalPointY}%`,
          }}
          aria-hidden="true"
        />
      )}

      {transitionImage && isTransitioning && (
        <div
          key="transition"
          style={{
            ...baseStyle,
            backgroundImage: `url(${transitionImage})`,
            backgroundPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: backgroundOpacity / 100,
            zIndex: 1,
            transition: 'opacity 2s ease-in-out',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default PunishmentBackgroundCarousel;
