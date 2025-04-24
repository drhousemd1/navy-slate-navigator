
import React, { createContext, useContext } from 'react';
import { PunishmentsContextType } from './types';
import { usePunishmentsData } from '@/data/PunishmentsDataHandler';

const PunishmentsContext = createContext<PunishmentsContextType | undefined>(undefined);

export const PunishmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const punishmentsData = usePunishmentsData();
  
  // Convert the return value from usePunishmentsData to match PunishmentsContextType
  const contextValue: PunishmentsContextType = {
    ...punishmentsData,
    // Override the applyPunishment function to match the expected return type
    applyPunishment: async (punishment) => {
      await punishmentsData.applyPunishment(punishment);
    }
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
