
import React from 'react';
import { usePunishmentImageCarousel } from './hooks/usePunishmentImageCarousel';

interface PunishmentBackgroundCarouselProps {
  backgroundImages?: (string | null)[];
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
  // Combine background_images array and single background_image_url
  const allImages: (string | null)[] = backgroundImages.length > 0 
    ? backgroundImages 
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

  const backgroundStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: backgroundOpacity / 100,
    zIndex: 0
  };

  return (
    <>
      {visibleImage && (
        <div 
          style={{
            ...backgroundStyle,
            backgroundImage: `url(${visibleImage})`,
            backgroundSize: 'cover',
            backgroundPosition: `${focalPointX}% ${focalPointY}%`,
            backgroundRepeat: 'no-repeat',
            transition: 'opacity 2s ease-in-out'
          }}
          aria-hidden="true"
        />
      )}
      {transitionImage && (
        <div
          style={{
            ...backgroundStyle,
            backgroundImage: `url(${transitionImage})`,
            backgroundSize: 'cover',
            backgroundPosition: `${focalPointX}% ${focalPointY}%`,
            backgroundRepeat: 'no-repeat',
            transition: 'opacity 2s ease-in-out',
            opacity: isTransitioning ? backgroundOpacity / 100 : 0,
            zIndex: 5
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default PunishmentBackgroundCarousel;
