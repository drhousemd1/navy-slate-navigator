
/**
 * DO NOT IMPLEMENT DATA LOGIC HERE.
 * This is only a wrapper around the centralized data hooks in /src/data/
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { QueryObserverResult } from '@tanstack/react-query';
import { PunishmentData, PunishmentHistoryItem } from './punishments/types';
import { usePunishmentsData } from '@/data';

// Define the context type
interface PunishmentsContextType {
  punishments: PunishmentData[];
  punishmentHistory: PunishmentHistoryItem[];
  totalPointsDeducted: number;
  isLoading: boolean;
  error: Error | null;
  savePunishment: (punishmentData: PunishmentData) => Promise<PunishmentData | null>;
  deletePunishment: (punishmentId: string) => Promise<boolean>;
  applyPunishment: (punishment: PunishmentData) => Promise<boolean>;
  refetchPunishments: () => Promise<QueryObserverResult<PunishmentData[], Error>>;
}

const PunishmentsContext = createContext<PunishmentsContextType | undefined>(undefined);

export const PunishmentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use the centralized data hook
  const { 
    punishments, 
    punishmentHistory,
    totalPointsDeducted,
    isLoading, 
    error, 
    savePunishment, 
    deletePunishment, 
    applyPunishment,
    refetchPunishments 
  } = usePunishmentsData();

  const value: PunishmentsContextType = {
    punishments,
    punishmentHistory,
    totalPointsDeducted,
    isLoading,
    error,
    savePunishment,
    deletePunishment,
    applyPunishment,
    refetchPunishments
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
