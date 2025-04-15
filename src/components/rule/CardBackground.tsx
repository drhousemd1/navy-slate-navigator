
import React, { useEffect } from 'react';

interface CardBackgroundProps {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
  focalPointX?: number;
  focalPointY?: number;
  backgroundOpacity?: number;
  onImageLoad?: () => void;
}

const CardBackground: React.FC<CardBackgroundProps> = ({
  visibleImage,
  transitionImage,
  isTransitioning,
  focalPointX = 50,
  focalPointY = 50,
  backgroundOpacity = 100,
  onImageLoad
}) => {
  // Preload image using JavaScript to ensure it's fully loaded before displaying
  useEffect(() => {
    if (!visibleImage) {
      // If there's no image, still trigger onImageLoad to prevent stalling
      if (onImageLoad) onImageLoad();
      return;
    }

    const img = new Image();
    img.src = visibleImage;
    img.onload = () => {
      if (onImageLoad) onImageLoad();
    };
    img.onerror = () => {
      // Even on error, we should trigger onImageLoad to not block the UI
      if (onImageLoad) onImageLoad();
    };
  }, [visibleImage, onImageLoad]);

  // Default placeholder image to prevent layout shifts
  const placeholderImage = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  
  // Process image sources to ensure they're valid URLs
  const processImageSource = (src: string | null) => {
    if (!src) return placeholderImage;
    return src;
  };

  const visibleSrc = processImageSource(visibleImage);
  const transitionSrc = processImageSource(transitionImage);

  return (
    <>
      {/* Always render the base image with a conditional source */}
      <img
        src={visibleSrc}
        alt=""
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{
          objectPosition: `${focalPointX}% ${focalPointY}%`,
          opacity: visibleImage ? backgroundOpacity / 100 : 0,
          transition: 'opacity 2s ease-in-out'
        }}
        draggable={false}
        aria-hidden="true"
        loading="lazy"
      />
      
      {/* Always render the transition image with a conditional source */}
      <img
        src={transitionSrc}
        alt=""
        className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
        style={{
          objectPosition: `${focalPointX}% ${focalPointY}%`,
          opacity: isTransitioning ? backgroundOpacity / 100 : 0,
          transition: 'opacity 2s ease-in-out'
        }}
        draggable={false}
        aria-hidden="true"
        loading="lazy"
      />
    </>
  );
};

export default CardBackground;
