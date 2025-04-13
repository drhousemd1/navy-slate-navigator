
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

  const opacity = backgroundOpacity / 100;
  
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
      {visibleImage && (
        <img
          src={visibleImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            opacity: opacity,
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            transition: 'opacity 2s ease-in-out'
          }}
          draggable={false}
        />
      )}

      {transitionImage && (
        <img
          src={transitionImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            opacity: isTransitioning ? opacity : 0,
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            transition: 'opacity 2s ease-in-out'
          }}
          draggable={false}
        />
      )}
    </div>
  );
};

export default RuleBackground;
