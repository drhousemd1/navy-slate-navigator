
import React, { useEffect, useState, memo } from 'react';
import { getPublicImageUrl } from '@/lib/getImageUrl';

interface CardBackgroundProps {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
  focalPointX?: number;
  focalPointY?: number;
  backgroundOpacity?: number;
}

const CardBackground: React.FC<CardBackgroundProps> = memo(({
  visibleImage,
  transitionImage,
  isTransitioning,
  focalPointX = 50,
  focalPointY = 50,
  backgroundOpacity = 100
}) => {
  // Default placeholder image to prevent layout shifts - 1x1 transparent gif
  const placeholderImage = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  
  // State to track if images are loaded to prevent layout shifts
  const [visibleImageLoaded, setVisibleImageLoaded] = useState(false);
  const [transitionImageLoaded, setTransitionImageLoaded] = useState(false);

  // Process image sources to ensure they're valid URLs
  const processImageSource = (src: string | null) => {
    if (!src) return placeholderImage;
    return src;
  };

  const visibleSrc = processImageSource(visibleImage);
  const transitionSrc = processImageSource(transitionImage);

  // Reset loaded state when images change
  useEffect(() => {
    setVisibleImageLoaded(!!visibleImage);
  }, [visibleImage]);

  useEffect(() => {
    setTransitionImageLoaded(!!transitionImage);
  }, [transitionImage]);

  // Common image style settings
  const imageStyle = {
    objectPosition: `${focalPointX}% ${focalPointY}%`,
    opacity: backgroundOpacity / 100,
    transition: 'opacity 0.5s ease-in-out', // Reduced transition time for better performance
    willChange: 'opacity', // Hint for browser optimization
  };

  return (
    <>
      {/* Base image */}
      <img
        src={visibleSrc}
        alt=""
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{
          ...imageStyle,
          opacity: visibleImageLoaded ? backgroundOpacity / 100 : 0,
        }}
        draggable={false}
        aria-hidden="true"
        loading="lazy"
        decoding="async" // Let browser optimize image decoding
        onLoad={() => setVisibleImageLoaded(true)}
      />
      
      {/* Transition image - only render when needed */}
      {transitionImage && (
        <img
          src={transitionSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
          style={{
            ...imageStyle,
            opacity: isTransitioning && transitionImageLoaded ? backgroundOpacity / 100 : 0,
          }}
          draggable={false}
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onLoad={() => setTransitionImageLoaded(true)}
        />
      )}
    </>
  );
});

CardBackground.displayName = 'CardBackground';

export default CardBackground;
