
import React, { createContext, useContext, useState, useEffect } from 'react';

interface RuleCarouselContextType {
  carouselTimer: number;
  setCarouselTimer: (value: number) => void;
  globalCarouselIndex: number;
  incrementCarouselIndex: () => void;
}

const defaultContext: RuleCarouselContextType = {
  carouselTimer: 5,
  setCarouselTimer: () => {},
  globalCarouselIndex: 0,
  incrementCarouselIndex: () => {},
};

const RuleCarouselContext = createContext<RuleCarouselContextType>(defaultContext);

export const useRuleCarousel = () => useContext(RuleCarouselContext);

export const RuleCarouselProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [carouselTimer, setCarouselTimer] = useState(5);
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  const incrementCarouselIndex = () => {
    setGlobalCarouselIndex(prevIndex => prevIndex + 1);
  };

  useEffect(() => {
    // Clear any existing interval
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    // Set up a new interval based on the current timer value
    const interval = setInterval(() => {
      incrementCarouselIndex();
    }, carouselTimer * 1000);

    setTimerInterval(interval);

    // Clean up on unmount or when timer changes
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [carouselTimer]);

  return (
    <RuleCarouselContext.Provider 
      value={{ 
        carouselTimer, 
        setCarouselTimer, 
        globalCarouselIndex, 
        incrementCarouselIndex 
      }}
    >
      {children}
    </RuleCarouselContext.Provider>
  );
};
