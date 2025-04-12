
import React from 'react';
import TaskBackgroundCarousel from './TaskBackgroundCarousel';

interface TaskBackgroundProps {
  backgroundImages?: (string | null)[] | null;
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
  globalCarouselIndex?: number;
}

const TaskBackground: React.FC<TaskBackgroundProps> = ({
  backgroundImages = [],
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
  globalCarouselIndex = 0
}) => {
  const filteredImages = backgroundImages && backgroundImages.length > 0 
    ? backgroundImages 
    : [];

  return (
    <div className="absolute inset-0 z-0">
      <TaskBackgroundCarousel
        backgroundImages={filteredImages}
        backgroundOpacity={backgroundOpacity}
        focalPointX={focalPointX}
        focalPointY={focalPointY}
        globalCarouselIndex={globalCarouselIndex}
      />
    </div>
  );
};

export default TaskBackground;
