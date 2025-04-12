
import React from 'react';
import TaskBackgroundCarousel from './TaskBackgroundCarousel';

const TaskBackground = ({
  backgroundImages = [],
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
  globalCarouselIndex = 0
}) => {
  return (
    <div className="absolute inset-0">
      <TaskBackgroundCarousel
        backgroundImages={backgroundImages}
        backgroundOpacity={backgroundOpacity}
        focalPointX={focalPointX}
        focalPointY={focalPointY}
        globalCarouselIndex={globalCarouselIndex}
      />
    </div>
  );
};

export default TaskBackground;
