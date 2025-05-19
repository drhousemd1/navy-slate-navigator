
import React, { createContext, useContext, ReactNode } from 'react';
import { PunishmentsContextType, PunishmentData, PunishmentHistoryItem, ApplyPunishmentArgs } from './types';
import { usePunishmentOperations } from '@/contexts/punishments/usePunishmentOperations';
import { QueryObserverResult } from '@tanstack/react-query';

const PunishmentsContext = createContext<PunishmentsContextType>({
  punishments: [],
  savePunishment: async () => ({} as PunishmentData),
  deletePunishment: async () => {},
  isLoading: false,
  error: null,
  applyPunishment: async () => {},
  recentlyAppliedPunishments: [],
  fetchRandomPunishment: () => null,
  refetchPunishments: async () => ({} as QueryObserverResult<PunishmentData[], Error>),
  getPunishmentHistory: () => [],
  historyLoading: false,
});

export const PunishmentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const punishmentOps = usePunishmentOperations();

  const contextValue: PunishmentsContextType = {
    punishments: punishmentOps.punishments || [],
    savePunishment: async (data: Partial<PunishmentData>): Promise<PunishmentData> => {
      if (data.id) {
        // It's an update
        return punishmentOps.updatePunishment(data.id, data);
      } else {
        // It's a create
        // Ensure required fields are present
        if (!data.title || data.points === undefined) {
          throw new Error('Punishment must have a title and points value');
        }
        // Pass as Partial<PunishmentData> without id, created_at, updated_at
        const { id, created_at, updated_at, ...creatableData } = data;
        return punishmentOps.createPunishment(creatableData);
      }
    },
    deletePunishment: punishmentOps.deletePunishment,
    isLoading: punishmentOps.isLoadingPunishments,
    error: punishmentOps.errorPunishments || null,
    applyPunishment: async (args: ApplyPunishmentArgs) => {
      if (args && args.id && args.costPoints !== undefined) {
        await punishmentOps.applyPunishment(args.id, args.costPoints);
      } else {
        console.error("Invalid arguments for applyPunishment", args);
      }
    },
    recentlyAppliedPunishments: [],
    fetchRandomPunishment: () => {
        const P = punishmentOps.punishments;
        if(P.length === 0) return null;
        return P[Math.floor(Math.random()*P.length)];
    },
    refetchPunishments: punishmentOps.refetchPunishments,
    getPunishmentHistory: punishmentOps.getPunishmentHistory,
    historyLoading: punishmentOps.isLoadingHistory,
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
