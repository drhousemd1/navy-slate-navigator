
import React from 'react';

interface RuleBackgroundProps {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
  focalPointX?: number;
  focalPointY?: number;
  backgroundOpacity?: number;
}

const RuleBackground: React.FC<RuleBackgroundProps> = ({
  visibleImage,
  transitionImage,
  isTransitioning,
  focalPointX = 50,
  focalPointY = 50,
  backgroundOpacity = 100
}) => {
  if (!visibleImage && !transitionImage) return null;
  
  return (
    <>
      {visibleImage && (
        <img
          src={visibleImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{ 
            transition: 'opacity 2s ease-in-out',
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
            transition: 'opacity 2s ease-in-out',
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: isTransitioning ? backgroundOpacity / 100 : 0
          }}
          draggable={false}
        />
      )}
    </>
  );
};

export default RuleBackground;
