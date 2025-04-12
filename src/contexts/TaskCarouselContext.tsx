
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TaskCarouselContextProps {
  carouselTimer: number;
  setCarouselTimer: (timer: number) => void;
}

const DEFAULT_CAROUSEL_TIMER = 5;
const LOCAL_STORAGE_KEY = 'task_carousel_timer';

const TaskCarouselContext = createContext<TaskCarouselContextProps | undefined>(undefined);

export const useTaskCarousel = (): TaskCarouselContextProps => {
  const context = useContext(TaskCarouselContext);
  if (!context) {
    throw new Error('useTaskCarousel must be used within a TaskCarouselProvider');
  }
  return context;
};

interface TaskCarouselProviderProps {
  children: ReactNode;
}

export const TaskCarouselProvider: React.FC<TaskCarouselProviderProps> = ({ children }) => {
  const [carouselTimer, setCarouselTimerState] = useState<number>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_CAROUSEL_TIMER;
  });

  // Persist carousel timer to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, carouselTimer.toString());
    console.log(`TaskCarouselContext: Timer updated to ${carouselTimer}s`);
  }, [carouselTimer]);

  const setCarouselTimer = (newTimer: number) => {
    console.log(`TaskCarouselContext: Setting timer to ${newTimer}s`);
    setCarouselTimerState(newTimer);
  };

  return (
    <TaskCarouselContext.Provider value={{ carouselTimer, setCarouselTimer }}>
      {children}
    </TaskCarouselContext.Provider>
  );
};
