
import React from 'react';
import { getPublicImageUrl } from '@/lib/getImageUrl';

interface CardBackgroundProps {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
  focalPointX?: number;
  focalPointY?: number;
  backgroundOpacity?: number;
  onImageLoad?: () => void; // Add the image load callback
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
        onLoad={onImageLoad} // Add the onImageLoad callback here
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
