
import React, { createContext, useContext } from 'react';
import { PunishmentsContextType } from './types';
import { usePunishmentsData } from '@/data/PunishmentsDataHandler';

const PunishmentsContext = createContext<PunishmentsContextType | undefined>(undefined);

export const PunishmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const punishmentsData = usePunishmentsData();
  
  // Create a context value that matches PunishmentsContextType
  const contextValue: PunishmentsContextType = {
    punishments: punishmentsData.punishments,
    punishmentHistory: punishmentsData.punishmentHistory,
    loading: punishmentsData.loading,
    historyLoading: punishmentsData.historyLoading,
    isSelectingRandom: punishmentsData.isSelectingRandom,
    selectedPunishment: punishmentsData.selectedPunishment,
    error: null,
    createPunishment: punishmentsData.createPunishment,
    updatePunishment: punishmentsData.updatePunishment,
    deletePunishment: punishmentsData.deletePunishment,
    applyPunishment: punishmentsData.applyPunishment,
    selectRandomPunishment: punishmentsData.selectRandomPunishment,
    resetRandomSelection: punishmentsData.resetRandomSelection,
    fetchPunishments: async () => {
      await punishmentsData.refetchPunishments();
    },
    refetchPunishments: punishmentsData.refetchPunishments,
    refetchHistory: punishmentsData.refetchHistory,
    getPunishmentHistory: (punishmentId: string) => {
      return punishmentsData.punishmentHistory.filter(item => 
        item.punishment_id === punishmentId
      );
    },
    totalPointsDeducted: punishmentsData.punishmentHistory.reduce(
      (total, item) => total + item.points_deducted, 0
    )
  };
  
  return (
    <PunishmentsContext.Provider value={contextValue}>
      {children}
    </PunishmentsContext.Provider>
  );
};

export const usePunishments = (): PunishmentsContextType => {
  const context = useContext(PunishmentsContext);
  if (context === undefined) {
    throw new Error('usePunishments must be used within a PunishmentsProvider');
  }
  return context;
};
