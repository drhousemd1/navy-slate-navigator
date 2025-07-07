import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { useWellbeingQuery } from './queries';
import { useUpsertWellbeing } from './mutations';
import { WellbeingSnapshot, CreateWellbeingData, DEFAULT_METRICS, WellbeingMetrics } from './types';
import { loadWellbeingFromDB, saveWellbeingToDB, getLastSyncTimeForWellbeing, setLastSyncTimeForWellbeing } from '@/data/indexedDB/useIndexedDB';
import { fetchWellbeingSnapshot } from './queries/fetchWellbeingSnapshot';
import { logger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { WELLBEING_QUERY_KEY } from './queries';
import { 
  computeWellbeingScore, 
  getMemoizedWellbeingScore, 
  getWellbeingColor, 
  getWellbeingColorClass, 
  getWellbeingStatus,
  transformMetricsForDisplay 
} from '@/lib/wellbeingUtils';

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export const useWellbeingData = () => {
  const { user } = useAuth();
  const userId = user?.id || null;
  const queryClient = useQueryClient();

  // Get cached data immediately from React Query
  const wellbeingQuery = useWellbeingQuery(userId);
  const upsertWellbeing = useUpsertWellbeing(userId);

  // Check and load from cache
  const checkAndLoadFromCache = useCallback(async () => {
    if (!userId) return;

    try {
      console.log('[useWellbeingData] Checking cache for wellbeing data...');
      logger.debug('[useWellbeingData] Checking cache for wellbeing data...');
      
      const localData = await loadWellbeingFromDB(userId);
      const lastSyncTime = await getLastSyncTimeForWellbeing(userId);
      
      const now = Date.now();
      const isRecentSync = lastSyncTime && (now - new Date(lastSyncTime).getTime()) < CACHE_DURATION;
      
      if (localData && isRecentSync) {
        console.log('[useWellbeingData] Using cached wellbeing data:', localData);
        logger.debug('[useWellbeingData] Using cached wellbeing data');
        queryClient.setQueryData([...WELLBEING_QUERY_KEY, userId], localData);
        return;
      }

      // Need to fetch from server
      logger.debug('[useWellbeingData] Cache miss or stale, fetching from server...');
      
      try {
        const serverData = await fetchWellbeingSnapshot(userId);
        
        if (serverData) {
          console.log('[useWellbeingData] Server data fetched:', serverData);
          await saveWellbeingToDB(serverData, userId);
          await setLastSyncTimeForWellbeing(new Date().toISOString(), userId);
          queryClient.setQueryData([...WELLBEING_QUERY_KEY, userId], serverData);
          logger.debug('[useWellbeingData] Successfully fetched and cached wellbeing data');
        } else {
          console.log('[useWellbeingData] No wellbeing data found on server');
          logger.debug('[useWellbeingData] No wellbeing data found on server');
          queryClient.setQueryData([...WELLBEING_QUERY_KEY, userId], null);
        }
      } catch (error) {
        logger.error('[useWellbeingData] Error fetching from server, using local fallback:', error);
        if (localData) {
          queryClient.setQueryData([...WELLBEING_QUERY_KEY, userId], localData);
        }
      }
    } catch (error) {
      logger.error('[useWellbeingData] Error in checkAndLoadFromCache:', error);
    }
  }, [userId, queryClient]);

  // Load data on mount
  useEffect(() => {
    if (userId) {
      checkAndLoadFromCache();
    }
  }, [userId, checkAndLoadFromCache]);

  // Helper function to get current metrics with defaults
  const getCurrentMetrics = useCallback(() => {
    const currentSnapshot = wellbeingQuery.data;
    return currentSnapshot?.metrics ? { ...DEFAULT_METRICS, ...currentSnapshot.metrics } : DEFAULT_METRICS;
  }, [wellbeingQuery.data]);

  // Helper function to save wellbeing data
  const saveWellbeingData = useCallback(async (metrics: WellbeingMetrics) => {
    if (!userId) {
      throw new Error('User must be logged in to save wellbeing data');
    }
    
    const overallScore = computeWellbeingScore(metrics);
    const data: CreateWellbeingData = {
      metrics,
      overall_score: overallScore
    };
    
    return upsertWellbeing.mutateAsync(data);
  }, [userId, upsertWellbeing]);

  // Get current wellbeing score
  const getCurrentScore = useCallback(() => {
    const currentMetrics = getCurrentMetrics();
    return getMemoizedWellbeingScore(currentMetrics);
  }, [getCurrentMetrics]);

  // Get wellbeing display information
  const getWellbeingInfo = useCallback(() => {
    const score = getCurrentScore();
    return {
      score,
      color: getWellbeingColor(score),
      colorClass: getWellbeingColorClass(score),
      status: getWellbeingStatus(score),
      metrics: transformMetricsForDisplay(getCurrentMetrics())
    };
  }, [getCurrentScore, getCurrentMetrics]);

  return {
    // Data
    wellbeingSnapshot: wellbeingQuery.data,
    isLoading: wellbeingQuery.isLoading,
    error: wellbeingQuery.error,
    
    // Helper methods
    getCurrentMetrics,
    getCurrentScore,
    getWellbeingInfo,
    saveWellbeingData,
    
    // Mutation states
    isSaving: upsertWellbeing.isPending,
    saveError: upsertWellbeing.error,
    
    // Cache management
    refetch: checkAndLoadFromCache,
  };
};