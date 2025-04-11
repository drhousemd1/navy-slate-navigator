import React from 'react';

interface Props {
  backgroundImages?: (string | null)[];
  backgroundImageUrl?: string;
  carouselTimer?: number;
  backgroundOpacity: number;
  focalPointX: number;
  focalPointY: number;
  visibleImage?: string | null;
  transitionImage?: string | null;
  isTransitioning?: boolean;
}

const PunishmentBackgroundCarousel: React.FC<Props> = ({
  visibleImage,
  transitionImage,
  backgroundOpacity,
  focalPointX,
  focalPointY,
}) => {
  return (
    <>
      {visibleImage && (
        <img
          src={visibleImage}
          alt="Visible Background"
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{
            transition: 'opacity 2s ease-in-out',
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: transitionImage ? 0 : backgroundOpacity / 100,
          }}
        />
      )}
      {transitionImage && (
        <img
          src={transitionImage}
          alt="Transitioning Background"
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{
            transition: 'opacity 2s ease-in-out',
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: backgroundOpacity / 100,
          }}
        />
      )}
    </>
  );
};

export default PunishmentBackgroundCarousel;
