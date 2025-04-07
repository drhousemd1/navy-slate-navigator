
import React from 'react';

interface Props {
  visibleImage: string | null;
  transitionImage: string | null;
  isTransitioning: boolean;
  focalPointX?: number;
  focalPointY?: number;
  backgroundOpacity?: number;
}

const AdminTestingCardBackground: React.FC<Props> = ({
  visibleImage,
  transitionImage,
  isTransitioning,
  focalPointX = 50,
  focalPointY = 50,
  backgroundOpacity = 100,
}) => {
  const createStyle = (image: string | null) => ({
    backgroundImage: image ? `url(${image})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: `${focalPointX}% ${focalPointY}%`,
    opacity: backgroundOpacity / 100,
    transition: 'opacity 0.8s ease-in-out',
  });

  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg">
      {visibleImage && (
        <div className="absolute inset-0 z-0" style={createStyle(visibleImage)} />
      )}
      {isTransitioning && transitionImage && (
        <div
          className="absolute inset-0 z-10"
          style={{ ...createStyle(transitionImage), opacity: 1 }}
        />
      )}
    </div>
  );
};

export default AdminTestingCardBackground;
