
import React, { createContext, useContext, useState, useCallback } from 'react';

interface RuleCarouselContextValue {
  timer: number;
  setTimer: (value: number | ((prev: number) => number)) => void;
  resyncFlag: number;
  resync: () => void;
}

const RuleCarouselContext = createContext<RuleCarouselContextValue | null>(null);

export const RuleCarouselProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timer, setTimerValue] = useState<number>(5);
  const [resyncFlag, setResyncFlag] = useState<number>(Date.now());

  const setTimer = useCallback((value: number | ((prev: number) => number)) => {
    if (typeof value === 'function') {
      setTimerValue(value);
    } else {
      setTimerValue(value);
    }
  }, []);

  const resync = useCallback(() => {
    setResyncFlag(Date.now());
  }, []);

  return (
    <RuleCarouselContext.Provider value={{ timer, setTimer, resync, resyncFlag }}>
      {children}
    </RuleCarouselContext.Provider>
  );
};

export const useRuleCarousel = () => {
  const context = useContext(RuleCarouselContext);
  if (!context) throw new Error('useRuleCarousel must be used within a RuleCarouselProvider');
  return context;
};
