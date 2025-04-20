import React, { createContext, useState, useEffect, useContext } from 'react';
import { usePunishmentOperations } from './usePunishmentOperations';

interface Punishment {
  id: string;
  title: string;
  points: number;
  // ... other properties as needed
}

interface PunishmentsContextType {
  punishments: Punishment[];
  punishmentHistory: any[];
  loading: boolean;
  error: Error | null;
  applyPunishment: (id: string, points: number) => Promise<void>;
  fetchPunishments: () => Promise<void>;
}

const PunishmentsContext = createContext<PunishmentsContextType | undefined>(undefined);

export const PunishmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { applyPunishment } = usePunishmentOperations();
  const [punishments, setPunishments] = useState<Punishment[]>([]);
  const [punishmentHistory, setPunishmentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch punishments from Supabase
  const fetchPunishments = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = (await import('@/integrations/supabase/client')).getSupabaseClient();
      const { data, error: fetchError } = await supabase.from('punishments').select('*');
      if (fetchError) {
        setError(fetchError);
      } else {
        setPunishments(data || []);
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPunishments();
  }, []);

  return (
    <PunishmentsContext.Provider
      value={{
        punishments,
        punishmentHistory,
        loading,
        error,
        applyPunishment,
        fetchPunishments,
      }}
    >
      {children}
    </PunishmentsContext.Provider>
  );
};

export const usePunishmentsContext = () => {
  const context = useContext(PunishmentsContext);
  if (!context) {
    throw new Error('usePunishmentsContext must be used within a PunishmentsProvider');
  }
  return context;
};
