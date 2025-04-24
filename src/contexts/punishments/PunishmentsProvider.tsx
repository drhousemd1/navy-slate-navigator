
import React, { createContext, useContext } from 'react';
import { PunishmentsContextType } from './types';
import { usePunishmentsData } from '@/data/PunishmentsDataHandler';

const PunishmentsContext = createContext<PunishmentsContextType | undefined>(undefined);

export const PunishmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const punishmentsData = usePunishmentsData();
  
  // Use React.useMemo to prevent unnecessary re-renders
  const contextValue = React.useMemo<PunishmentsContextType>(() => {
    return {
      ...punishmentsData
    };
  }, [
    punishmentsData.punishments,
    punishmentsData.punishmentHistory,
    punishmentsData.loading,
    punishmentsData.error,
    punishmentsData.totalPointsDeducted
  ]);
  
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
