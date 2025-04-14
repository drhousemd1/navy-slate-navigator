
import React from 'react';
import RuleBackgroundCarousel from '../rule/RuleBackgroundCarousel';

interface RuleBackgroundProps {
  backgroundImages?: (string | null)[] | null;
  backgroundImage?: string;
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
  globalCarouselIndex?: number;
}

const RuleBackground: React.FC<RuleBackgroundProps> = ({
  backgroundImages = [],
  backgroundImage,
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
  globalCarouselIndex = 0
}) => {
  return (
    <div className="absolute inset-0 z-0">
      <RuleBackgroundCarousel
        backgroundImages={backgroundImages}
        backgroundImageUrl={backgroundImage}
        backgroundOpacity={backgroundOpacity}
        focalPointX={focalPointX}
        focalPointY={focalPointY}
        globalCarouselIndex={globalCarouselIndex}
      />
    </div>
  );
};

export default RuleBackground;
