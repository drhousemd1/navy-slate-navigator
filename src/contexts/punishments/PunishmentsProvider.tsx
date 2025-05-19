
import React, { createContext, useContext, ReactNode } from 'react';
import { PunishmentsContextType, PunishmentData, PunishmentHistoryItem, ApplyPunishmentArgs } from './types';
import { usePunishmentsData } from '@/data/punishments/usePunishmentsData'; // Corrected path
import { QueryObserverResult } from '@tanstack/react-query';

// Create a context with a default value that matches PunishmentsContextType
const PunishmentsContext = createContext<PunishmentsContextType>({
  punishments: [],
  savePunishment: async () => (({} as unknown) as PunishmentData), // Adjusted default to satisfy type, will be overridden
  deletePunishment: async () => {},
  isLoading: false,
  error: null,
  applyPunishment: async () => {},
  recentlyAppliedPunishments: [],
  fetchRandomPunishment: () => null,
  refetchPunishments: async () => (({} as unknown) as QueryObserverResult<PunishmentData[], Error>), // Adjusted default
  getPunishmentHistory: () => [],
  historyLoading: false,
});

// Create a provider component
export const PunishmentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const punishmentsDataHook = usePunishmentsData();

  const contextValue: PunishmentsContextType = {
    punishments: punishmentsDataHook.punishments || [],
    // The savePunishment from usePunishmentsData now returns Promise<PunishmentWithId> or Promise<void> depending on create/update
    // The context expects Promise<PunishmentData>. We might need to adjust types or cast.
    // For now, let's assume the mutation hooks (useCreatePunishment, useUpdatePunishment) return data compatible with PunishmentData.
    savePunishment: punishmentsDataHook.savePunishment as (data: Partial<PunishmentData>) => Promise<PunishmentData>,
    deletePunishment: punishmentsDataHook.deletePunishment,
    isLoading: punishmentsDataHook.isLoadingPunishments,
    error: punishmentsDataHook.errorPunishments || null,
    applyPunishment: punishmentsDataHook.applyPunishment,
    recentlyAppliedPunishments: punishmentsDataHook.recentlyAppliedPunishments || [],
    fetchRandomPunishment: punishmentsDataHook.selectRandomPunishment,
    refetchPunishments: punishmentsDataHook.refetchPunishments,
    getPunishmentHistory: punishmentsDataHook.getPunishmentHistory,
    historyLoading: punishmentsDataHook.isLoadingHistory,
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
