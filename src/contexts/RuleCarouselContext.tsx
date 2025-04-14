
import React, { createContext, useContext, useState, useEffect } from 'react';

interface RuleCarouselContextType {
  carouselTimer: number;
  setCarouselTimer: (seconds: number) => void;
  globalCarouselIndex: number;
  setGlobalCarouselIndex: (index: number) => void;
}

const RuleCarouselContext = createContext<RuleCarouselContextType>({
  carouselTimer: 5,
  setCarouselTimer: () => {},
  globalCarouselIndex: 0,
  setGlobalCarouselIndex: () => {}
});

export const useRuleCarousel = () => useContext(RuleCarouselContext);

export const RuleCarouselProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [carouselTimer, setCarouselTimer] = useState(5);
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);

  // Load saved timer from localStorage on init
  useEffect(() => {
    const savedTimer = parseInt(localStorage.getItem('rules_carouselTimer') || '5', 10);
    setCarouselTimer(savedTimer);
  }, []);

  // Set up timer for carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalCarouselIndex(prevIndex => prevIndex + 1);
    }, carouselTimer * 1000);
    
    return () => clearInterval(interval);
  }, [carouselTimer]);

  const updateCarouselTimer = (seconds: number) => {
    setCarouselTimer(seconds);
    localStorage.setItem('rules_carouselTimer', String(seconds));
  };

  return (
    <RuleCarouselContext.Provider value={{
      carouselTimer,
      setCarouselTimer: updateCarouselTimer,
      globalCarouselIndex,
      setGlobalCarouselIndex
    }}>
      {children}
    </RuleCarouselContext.Provider>
  );
};
