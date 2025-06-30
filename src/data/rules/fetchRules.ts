
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { logger } from '@/lib/logger';
import {
  loadRulesFromDB,
  saveRulesToDB,
  getLastSyncTimeForRules,
  setLastSyncTimeForRules
} from "@/data/indexedDB/useIndexedDB";

export const fetchRules = async (subUserId: string | null, domUserId: string | null): Promise<Rule[]> => {
  if (!subUserId && !domUserId) {
    logger.debug("[fetchRules] No user IDs provided, returning empty array");
    return [];
  }

  // Check if we have cached data and if it's fresh (30 minute sync strategy)
  const localData = await loadRulesFromDB();
  const lastSync = await getLastSyncTimeForRules();
  let shouldFetch = true;

  if (lastSync) {
    const timeDiff = Date.now() - new Date(lastSync as string).getTime();
    if (timeDiff < 1000 * 60 * 30 && localData && localData.length > 0) {
      shouldFetch = false;
      logger.debug("[fetchRules] Using fresh cached data");
      return localData;
    }
  } else if (localData && localData.length > 0) {
    shouldFetch = false;
    logger.debug("[fetchRules] Using existing cached data");
    return localData;
  }

  // If we should fetch fresh data or have no cached data
  if (shouldFetch) {
    try {
      logger.debug('[fetchRules] Fetching fresh data from server with user filtering');
      
      // Build user filter - include both sub and dom user IDs for partner sharing
      const userIds = [subUserId, domUserId].filter(Boolean);
      
      if (userIds.length === 0) {
        logger.warn('[fetchRules] No valid user IDs for filtering');
        return localData || [];
      }

      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .in('user_id', userIds);
        // Removed .order('created_at', { ascending: false }) since sorting is now handled in frontend

      if (error) {
        logger.error('[fetchRules] Supabase error fetching rules:', error);
        // Return cached data if available, otherwise throw
        if (localData && localData.length > 0) {
          logger.debug('[fetchRules] Returning cached data due to server error');
          return localData.map(rule => ({
            ...rule,
            priority: (rule.priority as "low" | "medium" | "high") ?? "medium"
          })) as Rule[];
        }
        throw error;
      }

      const freshData = (data || []).map(rule => ({
        ...rule,
        priority: (rule.priority as "low" | "medium" | "high") ?? "medium"
      })) as Rule[];
      
      // Update cache with fresh data
      await saveRulesToDB(freshData);
      await setLastSyncTimeForRules(new Date().toISOString());
      logger.debug('[fetchRules] Rules fetched from server and saved to IndexedDB');
      
      return freshData;
    } catch (error) {
      logger.error('[fetchRules] Error fetching fresh rules:', error);
      
      // Fallback to cached data if available
      if (localData && localData.length > 0) {
        logger.debug('[fetchRules] Falling back to cached data');
        return localData.map(rule => ({
          ...rule,
          priority: (rule.priority as "low" | "medium" | "high") ?? "medium"
        })) as Rule[];
      }
      
      // No cached data available, re-throw the error
      throw error;
    }
  }

  return localData || [];
};
