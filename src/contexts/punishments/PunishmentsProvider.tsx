
// Fixed import path for types and added missing methods and global timer state
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { PunishmentData, PunishmentHistoryItem } from './types';

// Define the shape of the context, with all expected properties added
interface PunishmentsContextType {
  punishments: PunishmentData[];
  isLoading: boolean;
  fetchPunishments: () => Promise<void>;
  addPunishment: (punishment: PunishmentData) => Promise<void>;
  updatePunishment: (id: string, data: PunishmentData) => Promise<void>;
  deletePunishment: (id: string) => Promise<void>;

  // Additional methods used in hooks:
  applyPunishment: (id: string, points: number) => Promise<void>;
  getPunishmentHistory: (punishmentId: string) => PunishmentHistoryItem[];

  // Adding global carousel timer state
  globalCarouselTimer: number;
  setGlobalCarouselTimer: React.Dispatch<React.SetStateAction<number>>;
}

// Create default context value stub
const defaultContext: PunishmentsContextType = {
  punishments: [],
  isLoading: false,
  fetchPunishments: async () => {},
  addPunishment: async () => {},
  updatePunishment: async () => {},
  deletePunishment: async () => {},
  applyPunishment: async () => {},
  getPunishmentHistory: () => [],
  globalCarouselTimer: 5,
  setGlobalCarouselTimer: () => {},
};

// Create context
const PunishmentsContext = createContext<PunishmentsContextType>(defaultContext);

// Provider component
export const PunishmentsProvider = ({ children }: { children: ReactNode }) => {
  const [punishments, setPunishments] = useState<PunishmentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [punishmentHistory, setPunishmentHistory] = useState<PunishmentHistoryItem[]>([]);
  const [globalCarouselTimer, setGlobalCarouselTimer] = useState(5);

  // For now, stub async calls; these should connect to your backend or supabase in real usage.
  const fetchPunishments = useCallback(async () => {
    setIsLoading(true);
    // TODO: fetch punishments and history from backend or supabase here and call setPunishments, setPunishmentHistory
    setIsLoading(false);
  }, []);

  const addPunishment = useCallback(async (punishment: PunishmentData) => {
    setPunishments((prev) => [...prev, punishment]);
  }, []);

  const updatePunishment = useCallback(async (id: string, data: PunishmentData) => {
    setPunishments((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }, []);

  const deletePunishment = useCallback(async (id: string) => {
    setPunishments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Dummy placeholder for applyPunishment for now
  const applyPunishment = useCallback(async (id: string, points: number) => {
    // Add history item - should be replaced with correct backend logic
    setPunishmentHistory((prev) => [
      {
        id: `temp-${Date.now()}`,
        punishment_id: id,
        day_of_week: new Date().getDay(),
        points_deducted: points,
        applied_date: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  const getPunishmentHistory = useCallback(
    (punishmentId: string): PunishmentHistoryItem[] => {
      return punishmentHistory.filter((item) => item.punishment_id === punishmentId);
    },
    [punishmentHistory],
  );

  const value: PunishmentsContextType = {
    punishments,
    isLoading,
    fetchPunishments,
    addPunishment,
    updatePunishment,
    deletePunishment,
    applyPunishment,
    getPunishmentHistory,
    globalCarouselTimer,
    setGlobalCarouselTimer,
  };

  return <PunishmentsContext.Provider value={value}>{children}</PunishmentsContext.Provider>;
};

// Hook for consuming PunishmentsContext
export const usePunishments = () => {
  return useContext(PunishmentsContext);
};

