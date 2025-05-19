
import React, { createContext, useContext, ReactNode } from 'react';
import { PunishmentsContextType, PunishmentData, PunishmentHistoryItem, ApplyPunishmentArgs, CreatePunishmentVariables } from './types';
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
        if (!data.title || data.points === undefined) {
          throw new Error('Punishment must have a title and points value');
        }
        
        // Construct the object that matches Omit<CreatePunishmentVariables, 'user_id'>
        // This ensures that only valid fields for creation are passed and required ones are present.
        const punishmentToCreate: Omit<CreatePunishmentVariables, 'user_id'> = {
          title: data.title, // Known to be defined due to the check above
          points: data.points, // Known to be defined
          description: data.description,
          dom_supply: data.dom_supply, // This is in CreatePunishmentVariables
          icon_name: data.icon_name,
          icon_color: data.icon_color,
          background_image_url: data.background_image_url,
          background_opacity: data.background_opacity,
          title_color: data.title_color,
          subtext_color: data.subtext_color,
          calendar_color: data.calendar_color,
          highlight_effect: data.highlight_effect,
          focal_point_x: data.focal_point_x,
          focal_point_y: data.focal_point_y,
        };
        return punishmentOps.createPunishment(punishmentToCreate);
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
    recentlyAppliedPunishments: [], // This seems unused or needs specific implementation if required
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

