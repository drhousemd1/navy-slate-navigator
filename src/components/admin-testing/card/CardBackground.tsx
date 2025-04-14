
import React from 'react';
import EnhancedCardBackground from '@/components/shared/EnhancedCardBackground';

interface CardBackgroundProps {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
  focalPointX?: number;
  focalPointY?: number;
  backgroundOpacity?: number;
}

const CardBackground: React.FC<CardBackgroundProps> = ({
  visibleImage,
  transitionImage,
  isTransitioning,
  focalPointX = 50,
  focalPointY = 50,
  backgroundOpacity = 100
}) => {
  return (
    <EnhancedCardBackground
      visibleImage={visibleImage}
      transitionImage={transitionImage}
      isTransitioning={isTransitioning}
      focalPointX={focalPointX}
      focalPointY={focalPointY}
      backgroundOpacity={backgroundOpacity}
    />
  );
};

export default CardBackground;
