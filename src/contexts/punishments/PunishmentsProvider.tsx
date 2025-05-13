
import React, { createContext, useContext, ReactNode } from 'react';
import { PunishmentsContextType, PunishmentData, PunishmentHistoryItem, ApplyPunishmentArgs } from './types';
import { usePunishmentsData } from '@/data/punishments/usePunishmentsData';
import { QueryObserverResult } from '@tanstack/react-query';

// Create a context with a default value
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
  fetchPunishments: async () => [], // Update the return type to match the implementation
  refetchPunishments: async () => ({} as QueryObserverResult<PunishmentData[], Error>),
  refetchHistory: async () => ({} as QueryObserverResult<PunishmentHistoryItem[], Error>),
  getPunishmentHistory: () => [],
  totalPointsDeducted: 0
});

// Create a provider component
export const PunishmentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use the data hook
  const punishmentsData = usePunishmentsData();
  
  // Ensure the applyPunishment function has the correct type signature
  const typedPunishmentsData = {
    ...punishmentsData,
    applyPunishment: async (args: ApplyPunishmentArgs): Promise<PunishmentHistoryItem> => {
      // @ts-ignore - We're safely casting the function call to match our new type
      return await punishmentsData.applyPunishment(args);
    }
  };
  
  // Provide the context value
  return (
    <PunishmentsContext.Provider value={typedPunishmentsData as PunishmentsContextType}>
      {children}
    </PunishmentsContext.Provider>
  );
};

// Create a hook to use the context
export const usePunishments = () => {
  const context = useContext(PunishmentsContext);
  if (context === undefined) {
    throw new Error('usePunishments must be used within a PunishmentsProvider');
  }
  return context;
};
