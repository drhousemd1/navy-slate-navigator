
import React from 'react';
import TaskBackgroundCarousel from './TaskBackgroundCarousel';

const TaskBackground = ({
  backgroundImages = [],
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
  globalCarouselIndex = 0
}) => {
  // Apply a default blue-navy background if no images
  const bgStyle = backgroundImages.length === 0 
    ? { backgroundColor: '#0f172a' } // navy bg color
    : {};
    
  return (
    <div className="absolute inset-0 -z-10" style={bgStyle}>
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
