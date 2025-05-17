
import React, { createContext, useContext, ReactNode } from 'react';
import { PunishmentsContextType, PunishmentData, PunishmentHistoryItem, ApplyPunishmentArgs } from './types';
import { usePunishmentsData } from '@/data/punishments/usePunishmentsData';
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
  const punishmentsDataHook = usePunishmentsData();
  
  // Construct the context value, ensuring all properties of PunishmentsContextType are included
  // and types match.
  const contextValue: PunishmentsContextType = {
    punishments: punishmentsDataHook.punishments,
    savePunishment: punishmentsDataHook.savePunishment, // Assuming savePunishment handles create/update
    deletePunishment: punishmentsDataHook.deletePunishment,
    isLoading: punishmentsDataHook.isLoading,
    applyPunishment: punishmentsDataHook.applyPunishment as (args: ApplyPunishmentArgs) => Promise<void>, // Cast if necessary, ensure implementation matches
    recentlyAppliedPunishments: punishmentsDataHook.recentlyAppliedPunishments,
    fetchRandomPunishment: punishmentsDataHook.fetchRandomPunishment,
    refetchPunishments: punishmentsDataHook.refetchPunishments,
    getPunishmentHistory: punishmentsDataHook.getPunishmentHistory,
    historyLoading: punishmentsDataHook.historyLoading,
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
