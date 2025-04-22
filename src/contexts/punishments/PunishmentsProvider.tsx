
import React, { createContext, useContext } from 'react';
import { PunishmentsContextType } from './types';
import { usePunishmentsData } from '@/data/PunishmentsDataHandler';

const PunishmentsContext = createContext<PunishmentsContextType | undefined>(undefined);

export const PunishmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const punishmentsData = usePunishmentsData();
  
  // Add the missing properties required by PunishmentsContextType
  const contextValue: PunishmentsContextType = {
    ...punishmentsData,
    error: null,
    fetchPunishments: async () => {
      await punishmentsData.refetchPunishments();
    },
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
