
import React, { createContext, useContext, ReactNode } from 'react';
import { PunishmentsContextType, PunishmentData, PunishmentHistoryItem, ApplyPunishmentArgs } from './types';
import { usePunishmentsData } from '@/data/punishments/usePunishmentsData';
import { QueryObserverResult } from '@tanstack/react-query';

// Create a context with a default value that matches PunishmentsContextType
const PunishmentsContext = createContext<PunishmentsContextType>({
  punishments: [],
  savePunishment: async () => ({} as PunishmentData),
  deletePunishment: async () => {},
  isLoading: false,
  error: null, // Added default for error
  applyPunishment: async () => {},
  recentlyAppliedPunishments: [],
  fetchRandomPunishment: () => null,
  refetchPunishments: async () => ({} as QueryObserverResult<PunishmentData[], Error>),
  getPunishmentHistory: () => [],
  historyLoading: false,
});

// Create a provider component
export const PunishmentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const punishmentsDataHook = usePunishmentsData();

  const contextValue: PunishmentsContextType = {
    punishments: punishmentsDataHook.punishments || [],
    savePunishment: async (data: Partial<PunishmentData>) => {
      return punishmentsDataHook.savePunishment(data); 
    },
    deletePunishment: punishmentsDataHook.deletePunishment,
    isLoading: punishmentsDataHook.isLoadingPunishments,
    error: punishmentsDataHook.errorPunishments || null, // Pass error from hook
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
