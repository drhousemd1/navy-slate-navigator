
import React, { createContext, useContext, ReactNode } from 'react';
import { PunishmentsContextType, PunishmentData, PunishmentHistoryItem, ApplyPunishmentArgs } from './types';
import { usePunishmentOperations } from './usePunishmentOperations';
import { QueryObserverResult } from '@tanstack/react-query';

// Default values for the context, reflecting that CRUD ops are handled by mutation hooks
const defaultApplyPunishmentPlaceholder = async (_args: ApplyPunishmentArgs): Promise<void> => {
  console.warn("Default applyPunishment from context used. Ensure provider is set up.");
};

const PunishmentsContext = createContext<PunishmentsContextType>({
  punishments: [],
  // savePunishment and deletePunishment are removed
  isLoading: false,
  error: null,
  applyPunishment: defaultApplyPunishmentPlaceholder, 
  recentlyAppliedPunishments: [], 
  fetchRandomPunishment: () => null,
  refetchPunishments: async () => (({} as unknown) as QueryObserverResult<PunishmentData[], Error>),
  getPunishmentHistory: () => [],
  historyLoading: false,
});

export const PunishmentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const punishmentOperationsHook = usePunishmentOperations();

  const contextValue: PunishmentsContextType = {
    punishments: punishmentOperationsHook.punishments || [],
    isLoading: punishmentOperationsHook.loading,
    error: punishmentOperationsHook.error || null,
    applyPunishment: punishmentOperationsHook.applyPunishment, // This now matches the type
    recentlyAppliedPunishments: [], // Placeholder, needs sourcing if still essential via context
    fetchRandomPunishment: () => {
        const punishments = punishmentOperationsHook.punishments || [];
        if (punishments.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * punishments.length);
        return punishments[randomIndex];
    },
    refetchPunishments: punishmentOperationsHook.refetchPunishmentsData,
    getPunishmentHistory: punishmentOperationsHook.getPunishmentHistory,
    historyLoading: punishmentOperationsHook.loading, // Or use dedicated isLoadingHistory from hook if available
  };
  
  return (
    <PunishmentsContext.Provider value={contextValue}>
      {children}
    </PunishmentsContext.Provider>
  );
};

export const usePunishments = () => {
  const context = useContext(PunishmentsContext);
  if (context === undefined) {
    throw new Error('usePunishments must be used within a PunishmentsProvider');
  }
  return context;
};
