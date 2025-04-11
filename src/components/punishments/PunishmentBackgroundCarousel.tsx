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
      }, 2000); // match fade duration
      return () => clearTimeout(cleanup);
    }
  }, [transitionImage]);

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
    transition: 'none'
  };

  const fadeInStyle: React.CSSProperties = {
    ...baseStyle,
    zIndex: 1,
    transition: 'opacity 2s ease-in-out',
    opacity: showTransition ? backgroundOpacity / 100 : 0,
    pointerEvents: 'none'
  };

  return (
    <>
      {visibleImage && (
        <div
          key="visible"
          style={{
            ...baseStyle,
            backgroundImage: `url(${visibleImage})`,
            backgroundPosition: `${focalPointX}% ${focalPointY}%`
          }}
          aria-hidden="true"
        />
      )}

      {transitionImage && showTransition && (
        <div
          key="transition"
          style={{
            ...fadeInStyle,
            backgroundImage: `url(${transitionImage})`,
            backgroundPosition: `${focalPointX}% ${focalPointY}%`
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default PunishmentBackgroundCarousel;
