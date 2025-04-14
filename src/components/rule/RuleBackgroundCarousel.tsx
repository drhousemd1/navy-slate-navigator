
import React from 'react';
import { useImageCarousel } from '@/components/hooks/useImageCarousel';

interface RuleBackgroundCarouselProps {
  backgroundImages?: (string | null)[] | null;
  backgroundImageUrl?: string;
  carouselTimer?: number;
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
  globalCarouselIndex?: number;
}

const RuleBackgroundCarousel: React.FC<RuleBackgroundCarouselProps> = ({
  backgroundImages = [],
  backgroundImageUrl,
  carouselTimer = 5,
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
  globalCarouselIndex = 0
}) => {
  // Create a consolidated array of images, filtering out null or empty values
  const allImages = Array.isArray(backgroundImages) 
    ? [...backgroundImages.filter(img => !!img)] 
    : [];
  
  // Add backgroundImageUrl if it exists and isn't already in the array
  if (backgroundImageUrl && !allImages.includes(backgroundImageUrl)) {
    allImages.push(backgroundImageUrl);
  }
  
  // Filter out any null or empty strings to create the final image array
  const filteredImages = allImages.filter((img): img is string => 
    typeof img === 'string' && img.trim() !== ''
  );

  const {
    visibleImage,
    transitionImage,
    isTransitioning
  } = useImageCarousel({
    images: filteredImages,
    globalCarouselIndex
  });

  // Default placeholder image if both images are null (prevents layout shifts)
  const defaultImage = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  return (
    <>
      {/* Always render the visible image element, even if src is empty */}
      <img
        src={visibleImage || defaultImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{
          objectPosition: `${focalPointX}% ${focalPointY}%`,
          opacity: visibleImage ? backgroundOpacity / 100 : 0,
          transition: 'opacity 2s ease-in-out'
        }}
        aria-hidden="true"
        draggable={false}
      />

      {/* Always render the transition image element, even if src is empty */}
      <img
        src={transitionImage || defaultImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
        style={{
          objectPosition: `${focalPointX}% ${focalPointY}%`,
          opacity: isTransitioning ? backgroundOpacity / 100 : 0,
          transition: 'opacity 2s ease-in-out'
        }}
        aria-hidden="true"
        draggable={false}
      />
    </>
  );
};

export default RuleBackgroundCarousel;
