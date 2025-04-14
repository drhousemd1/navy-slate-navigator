
import React from 'react';

interface CardBackgroundProps {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
  focalPointX?: number;
  focalPointY?: number;
  backgroundOpacity?: number;
  transitionDuration?: number;
}

const CardBackground: React.FC<CardBackgroundProps> = ({
  visibleImage,
  transitionImage,
  isTransitioning,
  focalPointX = 50,
  focalPointY = 50,
  backgroundOpacity = 100,
  transitionDuration = 2000
}) => {
  if (!visibleImage && !transitionImage) return null;

  const transitionStyle = `opacity ${transitionDuration}ms ease-in-out`;

  return (
    <>
      {visibleImage && (
        <img
          src={visibleImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-100 z-0"
          style={{
            transition: transitionStyle,
            objectPosition: `${focalPointX}% ${focalPointY}%`,
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
            transition: transitionStyle,
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: isTransitioning ? backgroundOpacity / 100 : 0
          }}
          draggable={false}
        />
      )}
    </>
  );
};

export default CardBackground;
