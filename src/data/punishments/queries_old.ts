
// THIS FILE IS DEPRECATED AND WILL BE DELETED SOON.
// This file is kept temporarily for reference
// and will be deleted once the refactoring is verified

import { supabase } from '@/integrations/supabase/client';
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';
import { startOfWeek, format } from 'date-fns';
import { logger } from '@/lib/logger';

export const PUNISHMENTS_QUERY_KEY = ['punishments'];
export const PUNISHMENT_HISTORY_QUERY_KEY = ['punishment-history'];

export const fetchPunishments = async (): Promise<PunishmentData[]> => {
  logger.debug("[fetchPunishments] Starting punishments fetch");
  const startTime = performance.now();
  
  const { data, error } = await supabase
    .from('punishments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('[fetchPunishments] Error:', error);
    throw error;
  }
  
  const endTime = performance.now();
  logger.debug(`[fetchPunishments] Fetch completed in ${endTime - startTime}ms, retrieved ${data?.length || 0} punishments`);
  
  return data || [];
};

export const fetchCurrentWeekPunishmentHistory = async (): Promise<PunishmentHistoryItem[]> => {
  logger.debug("[fetchCurrentWeekPunishmentHistory] Starting history fetch");
  const startTime = performance.now();
  
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
  const startDate = format(startOfCurrentWeek, 'yyyy-MM-dd');
  
  const { data, error } = await supabase
    .from('punishment_history')
    .select('*')
    .gte('applied_date', startDate)
    .lte('applied_date', format(today, 'yyyy-MM-dd'))
    .order('applied_date', { ascending: false });

  const endTime = performance.now();
  logger.debug(`[fetchCurrentWeekPunishmentHistory] Fetch completed in ${endTime - startTime}ms`);
  
  if (error) {
    logger.error('[fetchCurrentWeekPunishmentHistory] Error:', error);
    throw error;
  }
  
  logger.debug(`[fetchCurrentWeekPunishmentHistory] Retrieved ${data?.length || 0} history items`);
  return data || [];
};
