
/**
 * DO NOT IMPLEMENT DATA LOGIC HERE.
 * This is only a wrapper around the centralized data hooks in /src/data/
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { QueryObserverResult } from '@tanstack/react-query';
import { usePunishmentsData } from '@/data';
import { PunishmentData, PunishmentHistoryItem, PunishmentsContextType } from './punishments/types';

// Export the types from this file as well for easier imports
export type { PunishmentData, PunishmentHistoryItem } from './punishments/types';

const PunishmentsContext = createContext<PunishmentsContextType | undefined>(undefined);

export const PunishmentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use the centralized data hook
  const {
    punishments,
    punishmentHistory,
    totalPointsDeducted,
    isLoading: loading,
    error,
    savePunishment,
    deletePunishment,
    applyPunishment,
    refetchPunishments
  } = usePunishmentsData();
  
  const [isSelectingRandom, setIsSelectingRandom] = React.useState(false);
  const [selectedPunishment, setSelectedPunishment] = React.useState<PunishmentData | null>(null);
  
  const selectRandomPunishment = () => {
    if (punishments.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * punishments.length);
    setSelectedPunishment(punishments[randomIndex]);
    setIsSelectingRandom(true);
  };
  
  const resetRandomSelection = () => {
    setSelectedPunishment(null);
    setIsSelectingRandom(false);
  };
  
  const createPunishment = async (punishmentData: Omit<Partial<PunishmentData>, 'title'> & { title: string }) => {
    const result = await savePunishment(punishmentData as PunishmentData);
    if (!result) throw new Error("Failed to create punishment");
    return result;
  };
  
  const updatePunishment = async (id: string, punishmentData: Partial<PunishmentData>) => {
    const result = await savePunishment({ ...punishmentData, id });
    if (!result) throw new Error("Failed to update punishment");
    return result;
  };
  
  const fetchPunishments = async (): Promise<PunishmentData[]> => {
    await refetchPunishments();
    return punishments;
  };
  
  const refetchHistory = async (options = {}): Promise<QueryObserverResult<PunishmentHistoryItem[], Error>> => {
    // This should come from the data hook - for now create a placeholder
    return Promise.resolve({} as QueryObserverResult<PunishmentHistoryItem[], Error>);
  };
  
  const getPunishmentHistory = (punishmentId: string): PunishmentHistoryItem[] => {
    return punishmentHistory.filter(item => item.punishment_id === punishmentId);
  };
  
  const value: PunishmentsContextType = {
    punishments,
    punishmentHistory,
    loading,
    historyLoading: false,
    isSelectingRandom,
    selectedPunishment,
    error,
    createPunishment,
    updatePunishment,
    deletePunishment,
    applyPunishment,
    selectRandomPunishment,
    resetRandomSelection,
    fetchPunishments,
    refetchPunishments,
    refetchHistory,
    getPunishmentHistory,
    totalPointsDeducted
  };

  return (
    <PunishmentsContext.Provider value={value}>
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
