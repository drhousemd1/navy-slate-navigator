
import React, { createContext, useContext, ReactNode } from 'react';
import { PunishmentsContextType, PunishmentData, PunishmentHistoryItem, ApplyPunishmentArgs } from './types';
// Changed import from usePunishmentsData to usePunishmentOperations directly
import { usePunishmentOperations } from '@/contexts/punishments/usePunishmentOperations';
import { QueryObserverResult } from '@tanstack/react-query';

const PunishmentsContext = createContext<PunishmentsContextType>({
  punishments: [],
  savePunishment: async () => ({} as PunishmentData), // This will use create/update from usePunishmentOperations
  deletePunishment: async () => {},
  isLoading: false, // This will be mapped from usePunishmentOperations.isLoadingPunishments
  error: null,
  applyPunishment: async () => {},
  recentlyAppliedPunishments: [], // This might need to be derived or removed if not used
  fetchRandomPunishment: () => null, // This might need to be derived or removed
  refetchPunishments: async () => ({} as QueryObserverResult<PunishmentData[], Error>),
  getPunishmentHistory: () => [],
  historyLoading: false, // This will be mapped from usePunishmentOperations.isLoadingHistory
});

export const PunishmentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const punishmentOps = usePunishmentOperations();

  const contextValue: PunishmentsContextType = {
    punishments: punishmentOps.punishments || [],
    // savePunishment now needs to differentiate between create and update
    savePunishment: async (data: Partial<PunishmentData>): Promise<PunishmentData> => {
      if (data.id) {
        // It's an update
        return punishmentOps.updatePunishment(data.id, data);
      } else {
        // It's a create
        // Omit id, created_at, updated_at for creation
        const { id, created_at, updated_at, ...creatableData } = data;
        return punishmentOps.createPunishment(creatableData);
      }
    },
    deletePunishment: punishmentOps.deletePunishment,
    isLoading: punishmentOps.isLoadingPunishments, // Use specific loading state
    error: punishmentOps.errorPunishments || null, // Use specific error state
    applyPunishment: async (args: ApplyPunishmentArgs) => {
      // Directly use properties from ApplyPunishmentArgs
      // punishmentOps.applyPunishment expects (punishmentId: string, points: number)
      await punishmentOps.applyPunishment(args.id, args.costPoints);
    },
    recentlyAppliedPunishments: [], // TODO: This needs a source or removal. For now, empty.
    fetchRandomPunishment: () => { // TODO: This needs implementation or removal.
        const P = punishmentOps.punishments;
        if(P.length === 0) return null;
        return P[Math.floor(Math.random()*P.length)];
    },
    refetchPunishments: punishmentOps.refetchPunishments,
    getPunishmentHistory: punishmentOps.getPunishmentHistory, // This is (punishmentId: string) => PunishmentHistoryItem[]
    historyLoading: punishmentOps.isLoadingHistory, // Use specific loading state for history
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

