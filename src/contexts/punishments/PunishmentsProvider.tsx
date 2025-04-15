
import React, { createContext, useContext, useEffect, useState } from 'react';
import { PunishmentsContextType } from './types';
import { usePunishmentOperations } from './usePunishmentOperations';

const PunishmentsContext = createContext<PunishmentsContextType | undefined>(undefined);

// Default carousel timer in seconds
const DEFAULT_CAROUSEL_TIMER = 5;

export const PunishmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalCarouselTimer, setGlobalCarouselTimer] = useState(DEFAULT_CAROUSEL_TIMER);
  const operations = usePunishmentOperations();
  
  useEffect(() => {
    // Fetch data on initial load
    operations.fetchPunishments().catch(err => {
      console.error("Error in initial punishment fetch:", err);
      // Error is already handled inside fetchPunishments
    });
  }, []);

  // Find the first punishment with a custom timer or use default
  useEffect(() => {
    if (operations.punishments.length > 0) {
      // Try to get timer from localStorage first
      const savedTimer = parseInt(localStorage.getItem('punishments_carouselTimer') || '5', 10);
      
      if (!isNaN(savedTimer) && savedTimer > 0 && savedTimer <= 30) {
        setGlobalCarouselTimer(savedTimer);
      } else {
        // Fall back to finding timer in punishments array
        const firstWithTimer = operations.punishments.find(p => p.carousel_timer !== undefined);
        if (firstWithTimer && firstWithTimer.carousel_timer) {
          setGlobalCarouselTimer(firstWithTimer.carousel_timer);
          // Also save to localStorage for consistency
          localStorage.setItem('punishments_carouselTimer', String(firstWithTimer.carousel_timer));
        }
      }
    }
  }, [operations.punishments]);

  const contextValue: PunishmentsContextType = {
    ...operations,
    globalCarouselTimer,
    setGlobalCarouselTimer
  };

  return (
    <PunishmentsContext.Provider value={contextValue}>
      {children}
    </PunishmentsContext.Provider>
  );
};

export const usePunishments = (): PunishmentsContextType => {
  const context = useContext(PunishmentsContext);
  if (context === undefined) {
    throw new Error('usePunishments must be used within a PunishmentsProvider');
  }
  return context;
};
