
import React from 'react';
import CardBackground from '@/components/rule/CardBackground';
import { usePunishmentImageCarousel } from './hooks/usePunishmentImageCarousel';

interface PunishmentBackgroundCarouselProps {
  backgroundImages?: (string | null)[];
  backgroundImageUrl?: string | null;
  carouselTimer?: number;
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
  globalCarouselIndex?: number;
}

const PunishmentBackgroundCarousel: React.FC<PunishmentBackgroundCarouselProps> = ({
  backgroundImages = [],
  backgroundImageUrl,
  carouselTimer = 5,
  backgroundOpacity = 50,
  focalPointX = 50,
  focalPointY = 50,
  globalCarouselIndex = 0
}) => {
  // Combine single backgroundImageUrl with array if provided
  const allImages = backgroundImageUrl 
    ? [backgroundImageUrl, ...(backgroundImages || [])] 
    : backgroundImages || [];
    
  // Filter out null values and empty strings
  const validImages = allImages.filter(Boolean);
  
  const { 
    currentImage,
    nextImage,
    isTransitioning
  } = usePunishmentImageCarousel({
    images: validImages,
    initialIndex: 0,
    transitionDuration: 2000, // 2 seconds for transition
    displayDuration: carouselTimer * 1000,
    globalIndex: globalCarouselIndex
  });

  if (!validImages || validImages.length === 0) {
    // Render nothing if no valid images
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      <CardBackground
        visibleImage={currentImage}
        transitionImage={nextImage}
        isTransitioning={isTransitioning}
        focalPointX={focalPointX}
        focalPointY={focalPointY}
        backgroundOpacity={backgroundOpacity}
      />
    </div>
  );
};

export default React.memo(PunishmentBackgroundCarousel);
