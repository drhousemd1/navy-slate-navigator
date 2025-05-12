
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { supabase } from '@/integrations/supabase/client';
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';
import { startOfWeek, format } from 'date-fns';

// Query keys with version
const CACHE_VERSION = 'v2';
export const PUNISHMENTS_QUERY_KEY = [`${CACHE_VERSION}_punishments`];
export const PUNISHMENT_HISTORY_QUERY_KEY = [`${CACHE_VERSION}_punishment-history`];

export const fetchPunishments = async (): Promise<PunishmentData[]> => {
  console.log("[fetchPunishments] Starting punishments fetch");
  const startTime = performance.now();
  
  const { data, error } = await supabase
    .from('punishments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchPunishments] Error:', error);
    throw error;
  }
  
  const endTime = performance.now();
  console.log(`[fetchPunishments] Fetch completed in ${endTime - startTime}ms, retrieved ${data?.length || 0} punishments`);
  
  return data || [];
};

export const fetchCurrentWeekPunishmentHistory = async (): Promise<PunishmentHistoryItem[]> => {
  console.log("[fetchCurrentWeekPunishmentHistory] Starting history fetch");
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
  console.log(`[fetchCurrentWeekPunishmentHistory] Fetch completed in ${endTime - startTime}ms`);
  
  if (error) {
    console.error('[fetchCurrentWeekPunishmentHistory] Error:', error);
    throw error;
  }
  
  console.log(`[fetchCurrentWeekPunishmentHistory] Retrieved ${data?.length || 0} history items`);
  return data || [];
};
