
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
    // Make sure title is required for createPunishment
    const result = await savePunishment({
      title: punishmentData.title,
      description: punishmentData.description || '',
      points: punishmentData.points || 0,
      ...punishmentData
    } as PunishmentData);
    
    if (!result) throw new Error("Failed to create punishment");
    return result;
  };
  
  const updatePunishment = async (id: string, punishmentData: Partial<PunishmentData>) => {
    // Make sure we have the required fields for the type
    if (!punishmentData.title) {
      throw new Error("Title is required when updating a punishment");
    }
    
    const result = await savePunishment({ 
      ...punishmentData, 
      id, 
      title: punishmentData.title,
      points: punishmentData.points || 0
    } as PunishmentData);
    
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
  
  // Create a wrapper around applyPunishment to match the expected signature
  const applyPunishmentWrapper = async (
    punishment: PunishmentData | { id: string; points: number; }
  ): Promise<PunishmentHistoryItem> => {
    // If we only have id and points, create a minimal PunishmentData object
    const punishmentData: PunishmentData = 'title' in punishment 
      ? punishment as PunishmentData 
      : {
          id: punishment.id,
          title: 'Unknown Punishment',  // Default title
          points: punishment.points,
          description: '',
          icon_name: ''
        };
        
    const result = await applyPunishment(punishmentData);
    
    // Create a history item since the actual function returns boolean
    const historyItem: PunishmentHistoryItem = {
      id: `hist_${Date.now()}`,
      punishment_id: punishmentData.id,
      applied_date: new Date().toISOString(),
      day_of_week: new Date().getDay(),
      points_deducted: punishmentData.points
    };
    
    return historyItem;
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
    applyPunishment: applyPunishmentWrapper, // Use our wrapper
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
