
import React, { createContext, useContext, useEffect, useState } from 'react';
import { PunishmentsContextType } from './types';
import { usePunishmentOperations } from './usePunishmentOperations';

const PunishmentsContext = createContext<PunishmentsContextType | undefined>(undefined);

export const PunishmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const operations = usePunishmentOperations();
  const [initialLoadAttempted, setInitialLoadAttempted] = useState(false);
  
  useEffect(() => {
    // Only attempt to fetch on first mount, don't refetch on rerenders
    if (!initialLoadAttempted) {
      operations.fetchPunishments();
      setInitialLoadAttempted(true);
    }
  }, [initialLoadAttempted]);

  return (
    <PunishmentsContext.Provider value={operations}>
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
