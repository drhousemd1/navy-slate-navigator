
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
  const allImages = backgroundImages?.length
    ? backgroundImages
    : backgroundImageUrl
    ? [backgroundImageUrl]
    : [];

  const filteredImages = allImages.filter((img): img is string => !!img);

  const {
    visibleImage,
    transitionImage,
    isTransitioning
  } = useImageCarousel({
    images: filteredImages,
    globalCarouselIndex
  });

  const defaultImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  return (
    <>
      <img
        src={visibleImage || defaultImage}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
        style={{ objectPosition: `${focalPointX}% ${focalPointY}%`, opacity: backgroundOpacity / 100 }}
      />
      {transitionImage && (
        <img
          src={transitionImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-100"
          style={{ objectPosition: `${focalPointX}% ${focalPointY}%`, opacity: backgroundOpacity / 100 }}
        />
      )}
    </>
  );
};

export default RuleBackgroundCarousel;
