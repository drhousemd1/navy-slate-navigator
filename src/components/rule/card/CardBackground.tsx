
import React from 'react';

interface CardBackgroundProps {
  currentImage: string | null;
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
  if (!currentImage) {
    return null;
  }
  
  // Ensure we have valid opacity value
  const safeOpacity = Math.max(0, Math.min(100, backgroundOpacity)) / 100;
  
  return (
    <>
      {currentImage && (
        <img
          src={currentImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{ 
            transition: 'opacity 0.5s ease-in-out',
            objectPosition: `${focalPointX * 100}% ${focalPointY * 100}%`,
            opacity: safeOpacity
          }}
          draggable={false}
        />
      )}

      <div
        className="absolute inset-0 bg-black z-5"
        style={{ opacity: 1 - safeOpacity }}
      />
    </>
  );
};

export default CardBackground;
