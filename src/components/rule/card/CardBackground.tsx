
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
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
      {transitionImage && isTransitioning && (
        <img
          src={transitionImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{
            objectPosition: `${focalPointX * 100}% ${focalPointY * 100}%`,
            opacity: backgroundOpacity / 100
          }}
        />
      )}
      {visibleImage && (
        <img
          src={visibleImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{
            objectPosition: `${focalPointX * 100}% ${focalPointY * 100}%`,
            opacity: backgroundOpacity / 100
          }}
        />
      )}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: (100 - backgroundOpacity) / 100 }}
      />
    </div>
  );
};

export default CardBackground;
