
import React, { createContext, useContext, useState, useEffect } from 'react';

interface RuleCarouselContextType {
  globalCarouselIndex: number;
  carouselTimer: number;
  setCarouselTimer: (timer: number) => void;
}

const RuleCarouselContext = createContext<RuleCarouselContextType>({
  globalCarouselIndex: 0,
  carouselTimer: 5,
  setCarouselTimer: () => {},
});

export const useRuleCarousel = () => useContext(RuleCarouselContext);

export const RuleCarouselProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);
  const [carouselTimer, setCarouselTimer] = useState(5);

  // Load timer setting from localStorage when component mounts
  useEffect(() => {
    const savedTimer = localStorage.getItem('ruleCarouselTimer');
    if (savedTimer) {
      setCarouselTimer(parseInt(savedTimer, 10));
    }
  }, []);

  // Save timer setting to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('ruleCarouselTimer', carouselTimer.toString());
  }, [carouselTimer]);

  // Increment the global carousel index at the specified interval
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalCarouselIndex(prevIndex => prevIndex + 1);
    }, carouselTimer * 1000);

    return () => clearInterval(interval);
  }, [carouselTimer]);

  return (
    <RuleCarouselContext.Provider value={{ globalCarouselIndex, carouselTimer, setCarouselTimer }}>
      {children}
    </RuleCarouselContext.Provider>
  );
};
