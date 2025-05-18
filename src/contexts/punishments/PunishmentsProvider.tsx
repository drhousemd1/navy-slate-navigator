import React, { createContext, useContext, ReactNode } from 'react';
import { PunishmentsContextType, PunishmentData, PunishmentHistoryItem, ApplyPunishmentArgs } from './types';
import { usePunishmentsData } from '@/data/punishments/usePunishmentsData'; // Assuming this is the correct hook
import { QueryObserverResult } from '@tanstack/react-query';

// Create a context with a default value that matches PunishmentsContextType
const PunishmentsContext = createContext<PunishmentsContextType>({
  punishments: [],
  savePunishment: async () => {},
  deletePunishment: async () => {},
  isLoading: false,
  applyPunishment: async () => {},
  recentlyAppliedPunishments: [],
  fetchRandomPunishment: () => null,
  refetchPunishments: async () => ({} as QueryObserverResult<PunishmentData[], Error>),
  getPunishmentHistory: () => [],
  historyLoading: false,
});

// Create a provider component
export const PunishmentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use the data hook
  const punishmentsDataHook = usePunishmentsData(); // This hook should provide all necessary functions and state

  // Construct the context value, ensuring all properties of PunishmentsContextType are included
  // and types match.
  const contextValue: PunishmentsContextType = {
    punishments: punishmentsDataHook.punishments || [],
    savePunishment: async (data: Partial<PunishmentData>) => {
      await punishmentsDataHook.savePunishment(data);
      // Intentionally not returning the result of savePunishment to match Promise<void>
    },
    deletePunishment: punishmentsDataHook.deletePunishment, // Ensure this returns Promise<void>
    isLoading: punishmentsDataHook.isLoadingPunishments, // Adjusted to match potential naming from usePunishmentsData
    applyPunishment: punishmentsDataHook.applyPunishment, // Ensure signature matches
    recentlyAppliedPunishments: punishmentsDataHook.recentlyAppliedPunishments || [],
    fetchRandomPunishment: punishmentsDataHook.selectRandomPunishment, // Adjusted to match potential naming
    refetchPunishments: punishmentsDataHook.refetchPunishments,
    getPunishmentHistory: punishmentsDataHook.getPunishmentHistory,
    historyLoading: punishmentsDataHook.isLoadingHistory, // Adjusted to match potential naming
  };
  
  return (
    <PunishmentsContext.Provider value={contextValue}>
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
