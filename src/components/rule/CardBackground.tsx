
import React from 'react';

interface CardBackgroundProps {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
  focalPointX?: number;
  focalPointY?: number;
  backgroundOpacity?: number;
}

const CardBackground: React.FC<CardBackgroundProps> = ({
  visibleImage,
  transitionImage,
  isTransitioning,
  focalPointX = 50,
  focalPointY = 50,
  backgroundOpacity = 100
}) => {
  // Default placeholder image to prevent layout shifts
  const placeholderImage = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  return (
    <>
      {/* Always render the base image with a conditional source */}
      <img
        src={visibleImage || placeholderImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{
          objectPosition: `${focalPointX}% ${focalPointY}%`,
          opacity: visibleImage ? backgroundOpacity / 100 : 0,
          transition: 'opacity 2s ease-in-out'
        }}
        draggable={false}
        aria-hidden="true"
      />
      
      {/* Always render the transition image with a conditional source */}
      <img
        src={transitionImage || placeholderImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
        style={{
          objectPosition: `${focalPointX}% ${focalPointY}%`,
          opacity: isTransitioning ? backgroundOpacity / 100 : 0,
          transition: 'opacity 2s ease-in-out'
        }}
        draggable={false}
        aria-hidden="true"
      />
    </>
  );
};

export default CardBackground;
