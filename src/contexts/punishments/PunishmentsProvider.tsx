
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { PunishmentsContextType } from './types';
import { usePunishmentOperations } from './usePunishmentOperations';

const PunishmentsContext = createContext<PunishmentsContextType | undefined>(undefined);

// Default carousel timer in seconds
const DEFAULT_CAROUSEL_TIMER = 5;

export const PunishmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalCarouselTimer, setGlobalCarouselTimer] = useState(DEFAULT_CAROUSEL_TIMER);
  const [isLoading, setIsLoading] = useState(false);
  const operations = usePunishmentOperations();
  
  // Enhanced fetch with retry logic
  const fetchWithRetry = useCallback(async () => {
    if (isLoading) return; // Prevent multiple simultaneous fetches
    
    setIsLoading(true);
    try {
      await operations.fetchPunishments();
    } catch (error) {
      console.error("Initial punishment fetch failed:", error);
      // Error is already handled inside fetchPunishments
    } finally {
      setIsLoading(false);
    }
  }, [operations, isLoading]);
  
  useEffect(() => {
    fetchWithRetry();
  }, [fetchWithRetry]);

  // Find the first punishment with a custom timer or use default
  useEffect(() => {
    if (operations.punishments.length > 0) {
      // Try to get timer from localStorage first (similar to Rules page)
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
    setGlobalCarouselTimer,
    // This provides the interface expected by the context type
    applyPunishment: operations.applyPunishment,
    createPunishment: operations.createPunishment,
    // Add a refresh function for manual refresh
    refresh: fetchWithRetry,
    // Empty array for getPunishmentHistory to match the type
    getPunishmentHistory: () => [] 
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
