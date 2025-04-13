
import React from 'react';
import { cn } from '@/lib/utils';

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
  if (!visibleImage && !transitionImage) return null;

  const opacity = backgroundOpacity / 100;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
      {visibleImage && (
        <img
          src={visibleImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity,
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            transition: 'opacity 2s ease-in-out'
          }}
          draggable={false}
        />
      )}
      {isTransitioning && transitionImage && (
        <img
          src={transitionImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity,
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            animation: 'fadeIn 2s ease-in-out'
          }}
          draggable={false}
        />
      )}
    </div>
  );
};

export default CardBackground;
