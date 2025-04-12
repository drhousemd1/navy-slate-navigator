
import React from 'react';
import TaskBackgroundCarousel from './TaskBackgroundCarousel';

const TaskBackground = ({
  backgroundImages = [],
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50
}) => {
  return (
    <div className="absolute inset-0 -z-10">
      <TaskBackgroundCarousel
        backgroundImages={backgroundImages}
        backgroundOpacity={backgroundOpacity}
        focalPointX={focalPointX}
        focalPointY={focalPointY}
      />
    </div>
  );
};

export default TaskBackground;
