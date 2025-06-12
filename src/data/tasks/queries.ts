
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
  getLastSyncTimeForTasks,
  setLastSyncTimeForTasks
} from "../indexedDB/useIndexedDB";
import { logger } from '@/lib/logger';
import { useUserIds } from '@/contexts/UserIdsContext';

export const TASKS_QUERY_KEY = ['tasks'];

export type TasksQueryResult = UseQueryResult<Task[], Error> & {
  isUsingCachedData?: boolean;
};

const transformSupabaseTask = (rawTask: RawSupabaseTask): Task => {
  // Since RawSupabaseTask now has the correct union types, no transformation needed
  return rawTask as Task;
};

export const fetchTasks = async (subUserId: string | null, domUserId: string | null): Promise<Task[]> => {
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
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[fetchTasks] Supabase error fetching tasks:', error);
      throw error;
    }

    logger.debug('[fetchTasks] Query returned tasks:', data?.length || 0, 'tasks');
    if (data && data.length > 0) {
      logger.debug('[fetchTasks] Sample task user_ids:', data.slice(0, 3).map(t => t.user_id));
    }

    return (data || []).map(transformSupabaseTask);
  } catch (error) {
    logger.error('[fetchTasks] Error fetching tasks:', error);
    throw error;
  }
};

export function useTasksQuery(): TasksQueryResult {
  const { subUserId, domUserId, isLoadingUserIds } = useUserIds();
  
  logger.debug('[useTasksQuery] Hook called with:', { subUserId, domUserId, isLoadingUserIds });
  
  const queryResult = useQuery<Task[], Error>({ 
    queryKey: [...TASKS_QUERY_KEY, subUserId, domUserId],
    queryFn: async (): Promise<Task[]> => { 
      logger.debug('[useTasksQuery queryFn] Starting with user IDs:', { subUserId, domUserId });
      
      if (!subUserId && !domUserId) {
        logger.debug('[useTasksQuery queryFn] No user IDs provided, returning empty array');
        return [];
      }

      const localData = await loadTasksFromDB();
      const lastSync = await getLastSyncTimeForTasks();
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
        return localData.map(task => transformSupabaseTask(task as RawSupabaseTask));
      }

      logger.debug('[useTasksQuery queryFn] Fetching tasks from server.');
      const serverData: Task[] = await fetchTasks(subUserId, domUserId);

      if (serverData) {
        await saveTasksToDB(serverData);
        await setLastSyncTimeForTasks(new Date().toISOString());
        logger.debug('[useTasksQuery queryFn] Saved server tasks to DB and updated sync time.');
        return serverData;
      }
      
      logger.debug('[useTasksQuery queryFn] No server data, returning local data or empty array for tasks.');
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
