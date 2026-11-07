import { legacyQueryKey, requireCurrentCacheToken, readCacheSnapshot, captureCacheToken, type CacheToken } from '@/data/indexedDB/useIndexedDB';

/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { Task, RawSupabaseTask } from "./types";
import { supabase } from "@/integrations/supabase/client";
import {
  loadTasksFromDB,
  saveTasksToDB,
  getLastSyncTimeForTasks } from "../indexedDB/useIndexedDB";
import { logger } from '@/lib/logger';
import { useUserIds } from '@/contexts/UserIdsContext';

export const TASKS_QUERY_KEY = ['tasks'];

export type TasksQueryResult = UseQueryResult<Task[], Error> & {
  isUsingCachedData?: boolean;
};

const transformSupabaseTask = (rawTask: RawSupabaseTask): Task => {
  return {
    ...rawTask,
    priority: (rawTask.priority === 'low' || rawTask.priority === 'medium' || rawTask.priority === 'high')
      ? rawTask.priority
      : 'medium' as const
  };
};

export const fetchTasks = async (subUserId: string | null, domUserId: string | null, cacheToken: CacheToken | null = captureCacheToken()): Promise<Task[]> => {
  if (!subUserId && !domUserId) {
    logger.debug("[fetchTasks] No user IDs provided, returning empty array");
    return [];
  }

  logger.debug('[fetchTasks] Fetching tasks with user filtering', { subUserId, domUserId });

  try {
    // Get current authenticated user to debug session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      logger.error('[fetchTasks] Auth error:', authError);
      throw authError;
    }

    logger.debug('[fetchTasks] Current authenticated user:', user?.id);

    // Build user filter - include both sub and dom user IDs for partner sharing
    const userIds = [subUserId, domUserId].filter(Boolean);

    if (userIds.length === 0) {
      logger.warn('[fetchTasks] No valid user IDs for filtering');
      return [];
    }

    logger.debug('[fetchTasks] Querying with user IDs:', userIds);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .in('user_id', userIds);
      // Removed .order('created_at', { ascending: false }) since sorting is now handled in frontend

    if (error) {
      logger.error('[fetchTasks] Supabase error fetching tasks:', error);
      throw error;
    }

    logger.debug('[fetchTasks] Query returned tasks:', data?.length || 0, 'tasks');
    if (data && data.length > 0) {
      logger.debug('[fetchTasks] Sample task user_ids:', data.slice(0, 3).map(t => t.user_id));
    }

    requireCurrentCacheToken(cacheToken);

    return (data || []).map(transformSupabaseTask);
  } catch (error) {
    logger.error('[fetchTasks] Error fetching tasks:', error);
    throw error;
  }
};

export function useTasksQuery(): TasksQueryResult {
  const cacheToken = captureCacheToken();
  const { subUserId, domUserId, isLoadingUserIds } = useUserIds();

  logger.debug('[useTasksQuery] Hook called with:', { subUserId, domUserId, isLoadingUserIds });

  const queryResult = useQuery<Task[], Error>({
    queryKey: legacyQueryKey(TASKS_QUERY_KEY, cacheToken),
    queryFn: async (): Promise<Task[]> => {
      logger.debug('[useTasksQuery queryFn] Starting with user IDs:', { subUserId, domUserId });

      if (!subUserId && !domUserId) {
        logger.debug('[useTasksQuery queryFn] No user IDs provided, returning empty array');
        return [];
      }

      const snapshot = await readCacheSnapshot<Task[]>('tasks', cacheToken);
      const localData = snapshot?.data ?? null;
      const lastSync = snapshot?.savedAt ?? null;
      let shouldFetch = true;

      logger.debug('[useTasksQuery queryFn] Local data:', localData?.length || 0, 'tasks');
      logger.debug('[useTasksQuery queryFn] Last sync:', lastSync);

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        logger.debug('[useTasksQuery queryFn] Time since last sync:', timeDiff, 'ms');
        if (timeDiff < 1000 * 60 * 30) { // 30 minutes
          shouldFetch = false;
          logger.debug('[useTasksQuery queryFn] Using cached data (within 30min window)');
        }
      }

      if (!shouldFetch && localData) {
        logger.debug('[useTasksQuery queryFn] Using local data for tasks.');
        requireCurrentCacheToken(cacheToken);
        return localData.map(task => transformSupabaseTask(task as RawSupabaseTask));
      }

      logger.debug('[useTasksQuery queryFn] Fetching tasks from server.');
      const serverData: Task[] = await fetchTasks(subUserId, domUserId, cacheToken);

      if (serverData) {
        try { await saveTasksToDB(serverData, cacheToken); } catch (error) { requireCurrentCacheToken(cacheToken); logger.warn('Server data loaded, but the device snapshot could not be saved.', error); }

        logger.debug('[useTasksQuery queryFn] Saved server tasks to DB and updated sync time.');
        requireCurrentCacheToken(cacheToken);
        return serverData;
      }

      logger.debug('[useTasksQuery queryFn] No server data, returning local data or empty array for tasks.');
      requireCurrentCacheToken(cacheToken);
      return localData ? localData.map(task => transformSupabaseTask(task as RawSupabaseTask)) : [];
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    gcTime: 1000 * 60 * 60, // 1 hour
    enabled: !isLoadingUserIds && !!(subUserId || domUserId), // Only run if we have user IDs and not loading
  });

  logger.debug('[useTasksQuery] Query result:', {
    dataLength: queryResult.data?.length || 0,
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message,
    isSuccess: queryResult.isSuccess
  });

  return {
    ...queryResult,
    isUsingCachedData: false
  };
}
