
import React from 'react';
import { useRuleImageCarousel } from '@/components/rule/hooks/useRuleImageCarousel';

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
  const allImages: (string | null)[] =
    backgroundImages && backgroundImages.length > 0
      ? backgroundImages
      : backgroundImageUrl
      ? [backgroundImageUrl]
      : [];
  
  const filteredImages = allImages.filter((img): img is string => !!img);

  const {
    visibleImage,
    transitionImage,
    isTransitioning
  } = useRuleImageCarousel({
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
