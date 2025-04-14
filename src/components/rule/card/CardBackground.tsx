
import React from 'react';

interface CardBackgroundProps {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
  focalPointX: number;
  focalPointY: number;
  backgroundOpacity: number;
}

const CardBackground: React.FC<CardBackgroundProps> = ({
  visibleImage,
  transitionImage,
  isTransitioning,
  focalPointX = 0.5,
  focalPointY = 0.5,
  backgroundOpacity = 100
}) => {
  if (!visibleImage && !transitionImage) {
    return null;
  }
  
  // Ensure we have valid opacity value
  const safeOpacity = Math.max(0, Math.min(100, backgroundOpacity)) / 100;
  
  return (
    <>
      {visibleImage && (
        <img
          src={visibleImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{ 
            transition: 'opacity 2s ease-in-out',
            objectPosition: `${focalPointX * 100}% ${focalPointY * 100}%`,
            opacity: safeOpacity
          }}
          draggable={false}
        />
      )}

      {transitionImage && (
        <img
          src={transitionImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
          style={{ 
            transition: 'opacity 2s ease-in-out',
            objectPosition: `${focalPointX * 100}% ${focalPointY * 100}%`,
            opacity: isTransitioning ? safeOpacity : 0
          }}
          draggable={false}
        />
      )}

      <div
        className="absolute inset-0 bg-black z-5"
        style={{ opacity: 1 - safeOpacity }}
      />
    </>
  );
};

export default CardBackground;
