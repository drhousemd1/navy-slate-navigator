
import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { PunishmentsContextType, PunishmentData, PunishmentHistoryItem } from './types';
import { usePunishmentsData } from '@/data/punishments/usePunishmentsData';
import { QueryObserverResult } from '@tanstack/react-query';

// Create a context with defaults
const PunishmentsContext = createContext<PunishmentsContextType>({
  punishments: [],
  punishmentHistory: [],
  loading: false,
  historyLoading: false,
  error: null,
  isSelectingRandom: false,
  selectedPunishment: null,
  createPunishment: async () => ({ id: '', title: '', points: 0 }),
  updatePunishment: async () => ({ id: '', title: '', points: 0 }),
  deletePunishment: async () => false,
  applyPunishment: async () => ({} as PunishmentHistoryItem),
  selectRandomPunishment: () => {},
  resetRandomSelection: () => {},
  fetchPunishments: async () => [],
  refetchPunishments: async () => ({} as QueryObserverResult<PunishmentData[], Error>),
  refetchHistory: async () => ({} as QueryObserverResult<PunishmentHistoryItem[], Error>),
  getPunishmentHistory: () => [],
  totalPointsDeducted: 0
});

// Provider component
export const PunishmentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use the data hook
  const punishmentsData = usePunishmentsData();
  
  // Force initial data fetch
  useEffect(() => {
    console.log('PunishmentsProvider: Initial data fetch');
    punishmentsData.refetchPunishments().catch(err => 
      console.error('Error fetching punishments:', err)
    );
    punishmentsData.refetchHistory().catch(err =>
      console.error('Error fetching punishment history:', err)
    );
  }, [punishmentsData]);
  
  // Provide the context value
  return (
    <PunishmentsContext.Provider value={punishmentsData as PunishmentsContextType}>
      {children}
    </PunishmentsContext.Provider>
  );
};

// Hook to use the context
export const usePunishments = () => {
  const context = useContext(PunishmentsContext);
  if (context === undefined) {
    throw new Error('usePunishments must be used within a PunishmentsProvider');
  }
  return context;
};
