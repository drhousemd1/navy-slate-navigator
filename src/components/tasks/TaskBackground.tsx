
import React from 'react';
import TaskBackgroundCarousel from './TaskBackgroundCarousel';

interface TaskBackgroundProps {
  backgroundImages?: (string | null)[] | null;
  backgroundImage?: string;
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
  globalCarouselIndex?: number;
}

const TaskBackground: React.FC<TaskBackgroundProps> = ({
  backgroundImages = [],
  backgroundImage,
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
  globalCarouselIndex = 0
}) => {
  return (
    <div className="absolute inset-0 z-0">
      <TaskBackgroundCarousel
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

export default TaskBackground;
