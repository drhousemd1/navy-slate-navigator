
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { PunishmentData, PunishmentHistoryItem } from './types';

// Define the shape of the context
interface PunishmentsContextType {
  punishments: PunishmentData[];
  isLoading: boolean;
  fetchPunishments: () => Promise<void>;
  addPunishment: (punishment: PunishmentData) => Promise<void>;
  updatePunishment: (id: string, data: PunishmentData) => Promise<void>;
  deletePunishment: (id: string) => Promise<void>;
  // Add more actions as needed
}

// Create default context value stub
const defaultContext: PunishmentsContextType = {
  punishments: [],
  isLoading: false,
  fetchPunishments: async () => { },
  addPunishment: async () => { },
  updatePunishment: async () => { },
  deletePunishment: async () => { },
};

// Create context
const PunishmentsContext = createContext<PunishmentsContextType>(defaultContext);

// Provider component
export const PunishmentsProvider = ({ children }: { children: ReactNode }) => {
  const [punishments, setPunishments] = useState<PunishmentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // For now, stub async calls; these should connect to your backend or supabase in real usage.
  const fetchPunishments = useCallback(async () => {
    setIsLoading(true);
    // TODO: fetch punishments from backend or supabase here and call setPunishments
    setIsLoading(false);
  }, []);

  const addPunishment = useCallback(async (punishment: PunishmentData) => {
    setPunishments(prev => [...prev, punishment]);
  }, []);

  const updatePunishment = useCallback(async (id: string, data: PunishmentData) => {
    setPunishments(prev => prev.map(p => (p.id === id ? { ...p, ...data } : p)));
  }, []);

  const deletePunishment = useCallback(async (id: string) => {
    setPunishments(prev => prev.filter(p => p.id !== id));
  }, []);

  const value: PunishmentsContextType = {
    punishments,
    isLoading,
    fetchPunishments,
    addPunishment,
    updatePunishment,
    deletePunishment,
  };

  return (
    <PunishmentsContext.Provider value={value}>
      {children}
    </PunishmentsContext.Provider>
  );
};

// Hook for consuming PunishmentsContext
export const usePunishments = () => {
  return useContext(PunishmentsContext);
};
