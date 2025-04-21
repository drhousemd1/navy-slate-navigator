import React, { createContext, useContext, useEffect, useState } from 'react';
import { PunishmentsContextType } from './types';

const PunishmentsContext = createContext<PunishmentsContextType | undefined>(undefined);

// Default carousel timer in seconds
const DEFAULT_CAROUSEL_TIMER = 5;

export const PunishmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [punishments, setPunishments] = useState<any[]>([]);
  const [punishmentHistory, setPunishmentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [globalCarouselTimer, setGlobalCarouselTimer] = useState(DEFAULT_CAROUSEL_TIMER);
  
  // Placeholder state to deduct points - this does nothing yet!
  const [totalPointsDeducted, setTotalPointsDeducted] = useState(0);

  useEffect(() => {
    const fetchPunishments = async () => {
      try {
        const { data, error } = await supabase
          .from('punishments')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        setPunishments(data || []);
      } catch (err) {
        console.error('Error fetching punishments:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPunishments();
  }, []);

  const createPunishment = async (punishmentData: any): Promise<string> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('punishments')
        .insert([punishmentData])
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      setPunishments(prevPunishments => [data, ...prevPunishments]);
      return data.id;
    } catch (err) {
      console.error('Error creating punishment:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePunishment = async (id: string, punishmentData: any): Promise<void> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('punishments')
        .update(punishmentData)
        .eq('id', id);
      
      if (error) {
        throw error;
      }

      setPunishments(prevPunishments =>
        prevPunishments.map(punishment => (punishment.id === id ? { ...punishment, ...punishmentData } : punishment))
      );
    } catch (err) {
      console.error('Error updating punishment:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deletePunishment = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('punishments')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      setPunishments(prevPunishments => prevPunishments.filter(punishment => punishment.id !== id));
    } catch (err) {
      console.error('Error deleting punishment:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  const applyPunishment = async (punishmentId: string, points: number): Promise<void> => {
    // Placeholder for applyPunishment logic
    // This function would ideally update user points or log the punishment
    console.log(`Applying punishment ${punishmentId} with ${points} points`);
  };

  const getPunishmentHistory = (punishmentId: string): any[] => {
    // Placeholder for getPunishmentHistory logic
    console.log(`Getting history for punishment ${punishmentId}`);
    return [];
  };

  const contextValue: PunishmentsContextType = {
    punishments,
    punishmentHistory,
    loading,
    error,
    globalCarouselTimer,
    setGlobalCarouselTimer,
    fetchPunishments: () => {},
    createPunishment,
    updatePunishment,
    deletePunishment,
    applyPunishment,
    getPunishmentHistory,
    totalPointsDeducted,
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

import { supabase } from '@/integrations/supabase/client';
