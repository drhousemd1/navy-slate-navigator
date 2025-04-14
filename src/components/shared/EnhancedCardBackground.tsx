
import React from 'react';

interface EnhancedCardBackgroundProps {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
  focalPointX?: number;
  focalPointY?: number;
  backgroundOpacity?: number;
  className?: string;
}

const EnhancedCardBackground: React.FC<EnhancedCardBackgroundProps> = ({
  visibleImage,
  transitionImage,
  isTransitioning,
  focalPointX = 50,
  focalPointY = 50,
  backgroundOpacity = 100,
  className = ''
}) => {
  if (!visibleImage && !transitionImage) return null;

  const transitionStyle = {
    transition: 'opacity 2s ease-in-out',
    objectPosition: `${focalPointX}% ${focalPointY}%`,
  };

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {visibleImage && (
        <img
          src={visibleImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{
            ...transitionStyle,
            opacity: backgroundOpacity / 100
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
            ...transitionStyle,
            opacity: isTransitioning ? backgroundOpacity / 100 : 0
          }}
          draggable={false}
          onError={(e) => {
            console.error("Error loading transition image");
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
    </div>
  );
};

export default EnhancedCardBackground;
