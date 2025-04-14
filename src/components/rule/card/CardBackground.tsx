
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
  if (!visibleImage && !transitionImage) return null;
  
  return (
    <>
      {visibleImage && (
        <img
          src={visibleImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-100 z-0"
          style={{ 
            transition: 'opacity 2s ease-in-out',
            objectPosition: `${focalPointX * 100}% ${focalPointY * 100}%`,
            opacity: backgroundOpacity / 100
          }}
          draggable={false}
        />
      )}

      {transitionImage && (
        <img
          src={transitionImage}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover z-10 pointer-events-none ${
            isTransitioning ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ 
            transition: 'opacity 2s ease-in-out',
            objectPosition: `${focalPointX * 100}% ${focalPointY * 100}%`,
            opacity: isTransitioning ? backgroundOpacity / 100 : 0
          }}
          draggable={false}
        />
      )}

      <div
        className="absolute inset-0 bg-black z-5"
        style={{ opacity: (100 - backgroundOpacity) / 100 }}
      />
    </>
  );
};

export default CardBackground;
