
import React, { createContext, useContext, ReactNode } from 'react';
import { PunishmentsContextType, PunishmentData, PunishmentHistoryItem } from './types'; // ApplyPunishmentArgs removed if applyPunishment changes/moves
import { usePunishmentOperations } from './usePunishmentOperations'; // Path to the refactored hook
import { QueryObserverResult } from '@tanstack/react-query';

// Default values for the context, reflecting that CRUD ops are moving out
const PunishmentsContext = createContext<PunishmentsContextType>({
  punishments: [],
  // savePunishment and deletePunishment are removed from context responsibility
  // savePunishment: async () => (({} as unknown) as PunishmentData), 
  // deletePunishment: async () => {},
  isLoading: false,
  error: null,
  applyPunishment: async () => {}, // This might also be removed if fully transitioned to direct hook usage
  recentlyAppliedPunishments: [], // This seems UI specific, might stay or be managed locally
  fetchRandomPunishment: () => null, // Specific utility, might stay
  refetchPunishments: async () => (({} as unknown) as QueryObserverResult<PunishmentData[], Error>),
  getPunishmentHistory: () => [],
  historyLoading: false,
});

export const PunishmentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const punishmentOperationsHook = usePunishmentOperations(); // Use the refactored hook

  const contextValue: PunishmentsContextType = {
    punishments: punishmentOperationsHook.punishments || [],
    // savePunishment and deletePunishment are no longer provided by this context
    isLoading: punishmentOperationsHook.loading,
    error: punishmentOperationsHook.error || null,
    applyPunishment: punishmentOperationsHook.applyPunishment, // Kept for now
    // recentlyAppliedPunishments: This needs to be sourced or managed if still needed.
    // For now, let's assume it was tied to the old applyPunishment logic.
    // If it's essential, it needs its own state management or derivation.
    // Placeholder:
    recentlyAppliedPunishments: [], 
    // fetchRandomPunishment: This also needs a source. If it was part of usePunishmentOperations, it needs to be there.
    // Placeholder:
    fetchRandomPunishment: () => {
        const punishments = punishmentOperationsHook.punishments || [];
        if (punishments.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * punishments.length);
        return punishments[randomIndex];
    }, // Basic random selection if needed from context
    refetchPunishments: punishmentOperationsHook.refetchPunishmentsData,
    getPunishmentHistory: punishmentOperationsHook.getPunishmentHistory,
    historyLoading: punishmentOperationsHook.loading, // Simplification, or use dedicated isLoadingHistory
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
