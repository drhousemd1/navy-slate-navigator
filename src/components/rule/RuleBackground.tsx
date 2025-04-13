
import React, { useEffect, useState } from 'react';

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
  // Add error handling for images
  const [visibleImageError, setVisibleImageError] = useState(false);
  const [transitionImageError, setTransitionImageError] = useState(false);

  // Reset error state when images change
  useEffect(() => {
    setVisibleImageError(false);
  }, [visibleImage]);

  useEffect(() => {
    setTransitionImageError(false);
  }, [transitionImage]);

  if ((!visibleImage || visibleImageError) && (!transitionImage || transitionImageError)) {
    return null;
  }

  return (
    <>
      {visibleImage && !visibleImageError && (
        <img
          src={visibleImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: backgroundOpacity / 100,
            transition: 'opacity 2s ease-in-out'
          }}
          onError={() => setVisibleImageError(true)}
          draggable={false}
        />
      )}
      {transitionImage && !transitionImageError && (
        <img
          src={transitionImage}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover z-1 pointer-events-none ${
            isTransitioning ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            objectPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: isTransitioning ? backgroundOpacity / 100 : 0,
            transition: 'opacity 2s ease-in-out'
          }}
          onError={() => setTransitionImageError(true)}
          draggable={false}
        />
      )}
    </>
  );
};

export default RuleBackground;
