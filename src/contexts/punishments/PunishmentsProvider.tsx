import React, { createContext, useContext, useEffect, useState } from 'react';
import { PunishmentsContextType } from './types';
import { usePunishmentOperations } from './usePunishmentOperations';
import { useQueryClient } from '@tanstack/react-query';

const PunishmentsContext = createContext<PunishmentsContextType | undefined>(undefined);

// Default carousel timer in seconds
const DEFAULT_CAROUSEL_TIMER = 5;

export const PunishmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalCarouselTimer, setGlobalCarouselTimer] = useState(DEFAULT_CAROUSEL_TIMER);
  const queryClient = useQueryClient();
  const operations = usePunishmentOperations();
  
  useEffect(() => {
    operations.fetchPunishments();
  }, []);

  // Find the first punishment with a custom timer or use default
  useEffect(() => {
    if (operations.punishments.length > 0) {
      const firstWithTimer = operations.punishments.find(p => p.carousel_timer !== undefined);
      if (firstWithTimer && firstWithTimer.carousel_timer) {
        setGlobalCarouselTimer(firstWithTimer.carousel_timer);
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
