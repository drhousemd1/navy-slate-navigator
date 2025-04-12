
import React, { createContext, useContext, useEffect, useState } from 'react';
import { TasksContextType } from './types';

// Default carousel timer in seconds
const DEFAULT_CAROUSEL_TIMER = 5;

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);
  const [globalCarouselTimer, setGlobalCarouselTimer] = useState(DEFAULT_CAROUSEL_TIMER);

  // Effect to increment the global carousel index using the timer
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalCarouselIndex(prevIndex => prevIndex + 1);
    }, globalCarouselTimer * 1000);
    
    console.log(`Setting task carousel interval to ${globalCarouselTimer} seconds`);
    return () => clearInterval(interval);
  }, [globalCarouselTimer]);

  const contextValue: TasksContextType = {
    globalCarouselIndex,
    globalCarouselTimer,
    setGlobalCarouselTimer
  };

  return (
    <TasksContext.Provider value={contextValue}>
      {children}
    </TasksContext.Provider>
  );
};

export const useTasks = (): TasksContextType => {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
};
