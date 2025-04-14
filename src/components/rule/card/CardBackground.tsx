
import React, { useEffect } from 'react';

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
  // Debug logging
  useEffect(() => {
    console.log("CardBackground rendering with props:", {
      hasVisibleImage: Boolean(visibleImage),
      hasTransitionImage: Boolean(transitionImage),
      isTransitioning,
      focalPointX,
      focalPointY,
      backgroundOpacity
    });
    
    if (visibleImage) {
      console.log("Visible image preview:", typeof visibleImage === 'string' ? 
        (visibleImage.substring(0, 100) + '...') : 'Not a string');
    }
  }, [visibleImage, transitionImage, isTransitioning, focalPointX, focalPointY, backgroundOpacity]);

  if (!visibleImage && !transitionImage) {
    console.log("No images to display in CardBackground");
    return null;
  }
  
  // Ensure we have valid opacity value
  const safeOpacity = Math.max(0, Math.min(100, backgroundOpacity)) / 100;
  
  return (
    <>
      {visibleImage && (
        <img
          src={visibleImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{ 
            transition: 'opacity 2s ease-in-out',
            objectPosition: `${focalPointX * 100}% ${focalPointY * 100}%`,
            opacity: safeOpacity
          }}
          draggable={false}
          onLoad={() => console.log("Visible image loaded successfully")}
          onError={(e) => {
            console.error("Error loading visible image:", e);
            console.error("Failed image URL:", visibleImage);
          }}
        />
      )}

      {transitionImage && (
        <img
          src={transitionImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
          style={{ 
            transition: 'opacity 2s ease-in-out',
            objectPosition: `${focalPointX * 100}% ${focalPointY * 100}%`,
            opacity: isTransitioning ? safeOpacity : 0
          }}
          draggable={false}
          onLoad={() => console.log("Transition image loaded successfully")}
          onError={(e) => {
            console.error("Error loading transition image:", e);
            console.error("Failed image URL:", transitionImage);
          }}
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
