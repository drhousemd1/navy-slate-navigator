
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TaskCarouselContextProps {
  carouselTimer: number;
  setCarouselTimer: (timer: number) => void;
  globalCarouselIndex: number;
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
  const [carouselTimer, setCarouselTimer] = useState<number>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_CAROUSEL_TIMER;
  });
  
  // Global carousel index state
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);

  // Persist carousel timer to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, carouselTimer.toString());
    console.log(`TaskCarouselContext: Timer updated to ${carouselTimer}s`);
  }, [carouselTimer]);

  // Fetch tasks to get carousel timer from first task with timer defined
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;
        
        if (!userId) return;
        
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId);
          
        if (tasks && tasks.length > 0) {
          const firstWithTimer = tasks.find(t => t.carousel_timer !== undefined);
          if (firstWithTimer && firstWithTimer.carousel_timer) {
            setCarouselTimer(firstWithTimer.carousel_timer);
          }
        }
      } catch (error) {
        console.error('Error fetching tasks for carousel timer:', error);
      }
    };
    
    fetchTasks();
  }, []);

  // Effect to increment the global carousel index
  useEffect(() => {
    console.log(`TaskCarouselContext: Setting up timer interval of ${carouselTimer}s`);
    const interval = setInterval(() => {
      setGlobalCarouselIndex((prevIndex) => prevIndex + 1);
    }, carouselTimer * 1000);
    
    return () => clearInterval(interval);
  }, [carouselTimer]);

  return (
    <TaskCarouselContext.Provider value={{ 
      carouselTimer, 
      setCarouselTimer,
      globalCarouselIndex,
    }}>
      {children}
    </TaskCarouselContext.Provider>
  );
};
