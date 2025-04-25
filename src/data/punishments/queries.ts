
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';
import { startOfWeek, format } from 'date-fns';

export const PUNISHMENTS_QUERY_KEY = ['punishments'];
export const PUNISHMENT_HISTORY_QUERY_KEY = ['punishment-history'];

export const fetchPunishments = async (): Promise<PunishmentData[]> => {
  const { data, error } = await supabase
    .from('punishments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchCurrentWeekPunishmentHistory = async (): Promise<PunishmentHistoryItem[]> => {
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
  const startDate = format(startOfCurrentWeek, 'yyyy-MM-dd');
  
  const { data, error } = await supabase
    .from('punishment_history')
    .select('*')
    .gte('applied_date', startDate)
    .lte('applied_date', format(today, 'yyyy-MM-dd'))
    .order('applied_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

