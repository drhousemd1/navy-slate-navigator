
import React from 'react';

interface RuleBackgroundProps {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
  focalPointX: number;
  focalPointY: number;
  backgroundOpacity: number;
}

const RuleBackground: React.FC<RuleBackgroundProps> = ({
  visibleImage,
  transitionImage,
  isTransitioning,
  focalPointX,
  focalPointY,
  backgroundOpacity
}) => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden rounded-xl">
      {/* Background gradient if no image */}
      {!visibleImage && !transitionImage && (
        <div className="absolute inset-0 bg-gradient-to-br from-dark-navy to-navy" />
      )}

      {/* Visible image */}
      {visibleImage && (
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ 
            backgroundImage: `url(${visibleImage})`,
            backgroundSize: 'cover',
            backgroundPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: backgroundOpacity / 100 * (isTransitioning ? 0.3 : 1),
            transition: 'opacity 2s ease'
          }}
        />
      )}

      {/* Transition image */}
      {transitionImage && isTransitioning && (
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ 
            backgroundImage: `url(${transitionImage})`,
            backgroundSize: 'cover',
            backgroundPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: backgroundOpacity / 100 * 0.7,
            transition: 'opacity 2s ease'
          }}
        />
      )}

      {/* Overlay to darken the image */}
      <div 
        className="absolute inset-0 bg-black" 
        style={{ 
          opacity: 1 - (backgroundOpacity / 100)
        }} 
      />
    </div>
  );
};

export default RuleBackground;
