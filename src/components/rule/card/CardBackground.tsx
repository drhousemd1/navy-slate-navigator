
import React from 'react';

interface CardBackgroundProps {
  currentImage: {
    visibleImage: string | null;
    transitionImage: string | null;
    isTransitioning: boolean;
  };
  focalPointX: number;
  focalPointY: number;
  backgroundOpacity: number;
}

const CardBackground: React.FC<CardBackgroundProps> = ({
  currentImage,
  focalPointX = 0.5,
  focalPointY = 0.5,
  backgroundOpacity = 100
}) => {
  // Ensure we have valid opacity value
  const safeOpacity = Math.max(0, Math.min(100, backgroundOpacity)) / 100;
  
  return (
    <>
      {/* Visible base image */}
      {currentImage.visibleImage && (
        <img
          src={currentImage.visibleImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{ 
            objectPosition: `${focalPointX * 100}% ${focalPointY * 100}%`,
            opacity: safeOpacity,
            transition: 'opacity 1s ease-in-out'
          }}
          draggable={false}
        />
      )}

      {/* Transition image that fades in */}
      {currentImage.transitionImage && (
        <img
          src={currentImage.transitionImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-10"
          style={{ 
            objectPosition: `${focalPointX * 100}% ${focalPointY * 100}%`,
            opacity: currentImage.isTransitioning ? safeOpacity : 0,
            transition: 'opacity 1s ease-in-out',
            pointerEvents: 'none'
          }}
          draggable={false}
        />
      )}

      {/* Background overlay for opacity control */}
      <div
        className="absolute inset-0 bg-black z-5"
        style={{ opacity: 1 - safeOpacity }}
      />
    </>
  );
};

export default CardBackground;
