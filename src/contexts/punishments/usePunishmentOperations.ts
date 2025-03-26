
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from './types';

export const usePunishmentOperations = () => {
  const [punishments, setPunishments] = useState<PunishmentData[]>([]);
  const [punishmentHistory, setPunishmentHistory] = useState<PunishmentHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalPointsDeducted, setTotalPointsDeducted] = useState<number>(0);

  const fetchPunishments = async () => {
    try {
      setLoading(true);
      
      const { data: punishmentsData, error: punishmentsError } = await supabase
        .from('punishments')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (punishmentsError) throw punishmentsError;
      
      const { data: historyData, error: historyError } = await supabase
        .from('punishment_history')
        .select('*')
        .order('applied_date', { ascending: false });
      
      if (historyError) throw historyError;
      
      setPunishments(punishmentsData || []);
      setPunishmentHistory(historyData || []);
      
      const totalDeducted = (historyData || []).reduce((sum, item) => sum + item.points_deducted, 0);
      setTotalPointsDeducted(totalDeducted);
      
    } catch (error) {
      console.error('Error fetching punishments:', error);
      setError(error instanceof Error ? error : new Error('Failed to fetch punishments'));
      toast({
        title: "Error",
        description: "Failed to load punishments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPunishment = async (punishmentData: PunishmentData): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('punishments')
        .insert(punishmentData)
        .select()
        .single();
      
      if (error) throw error;
      
      setPunishments(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Punishment created successfully",
      });
      
      return data.id;
    } catch (error) {
      console.error('Error creating punishment:', error);
      toast({
        title: "Error",
        description: "Failed to create punishment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePunishment = async (id: string, punishmentData: PunishmentData): Promise<void> => {
    try {
      const { id: _, ...dataToUpdate } = punishmentData;
      
      const { error } = await supabase
        .from('punishments')
        .update(dataToUpdate)
        .eq('id', id);
      
      if (error) throw error;
      
      setPunishments(prev => 
        prev.map(punishment => 
          punishment.id === id ? { ...punishment, ...dataToUpdate } : punishment
        )
      );
      
      toast({
        title: "Success",
        description: "Punishment updated successfully",
      });
    } catch (error) {
      console.error('Error updating punishment:', error);
      toast({
        title: "Error",
        description: "Failed to update punishment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deletePunishment = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('punishments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setPunishments(prev => prev.filter(punishment => punishment.id !== id));
      setPunishmentHistory(prev => prev.filter(item => item.punishment_id !== id));
      
      toast({
        title: "Success",
        description: "Punishment deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting punishment:', error);
      toast({
        title: "Error",
        description: "Failed to delete punishment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const applyPunishment = async (punishmentId: string, points: number): Promise<void> => {
    try {
      const today = new Date();
      const dayOfWeek = today.getDay();
      
      const historyEntry = {
        punishment_id: punishmentId,
        day_of_week: dayOfWeek,
        points_deducted: points
      };
      
      const { data, error } = await supabase
        .from('punishment_history')
        .insert(historyEntry)
        .select()
        .single();
      
      if (error) throw error;
      
      setPunishmentHistory(prev => [data, ...prev]);
      setTotalPointsDeducted(prev => prev + points);
      
      toast({
        title: "Punishment Applied",
        description: `${points} points deducted.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error applying punishment:', error);
      toast({
        title: "Error",
        description: "Failed to apply punishment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getPunishmentHistory = (punishmentId: string): PunishmentHistoryItem[] => {
    return punishmentHistory.filter(item => item.punishment_id === punishmentId);
  };

  return {
    punishments,
    punishmentHistory,
    loading,
    error,
    totalPointsDeducted,
    fetchPunishments,
    createPunishment,
    updatePunishment,
    deletePunishment,
    applyPunishment,
    getPunishmentHistory
  };
};
