
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
  return {
    ...rawTask,
    priority: (rawTask.priority === 'low' || rawTask.priority === 'medium' || rawTask.priority === 'high') 
      ? rawTask.priority 
      : 'medium' as const
  };
};

export const fetchTasks = async (subUserId: string | null, domUserId: string | null): Promise<Task[]> => {
  if (!subUserId && !domUserId) {
    logger.debug("[fetchTasks] No user IDs provided, returning empty array");
    return [];
  }

  logger.debug('[fetchTasks] Fetching tasks with user filtering');
  
  try {
    // Build user filter - include both sub and dom user IDs for partner sharing
    const userIds = [subUserId, domUserId].filter(Boolean);
    
    if (userIds.length === 0) {
      logger.warn('[fetchTasks] No valid user IDs for filtering');
      return [];
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[fetchTasks] Supabase error fetching tasks:', error);
      throw error;
    }

    return (data || []).map(transformSupabaseTask);
  } catch (error) {
    logger.error('[fetchTasks] Error fetching tasks:', error);
    throw error;
  }
};

export function useTasksQuery(): TasksQueryResult {
  const { subUserId, domUserId } = useUserIds();
  
  const queryResult = useQuery<Task[], Error>({ 
    queryKey: [...TASKS_QUERY_KEY, subUserId, domUserId],
    queryFn: async (): Promise<Task[]> => { 
      if (!subUserId && !domUserId) {
        logger.debug('[useTasksQuery queryFn] No user IDs provided, returning empty array');
        return [];
      }

      const localData: Task[] | null = await loadTasksFromDB();
      const lastSync = await getLastSyncTimeForTasks();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        if (timeDiff < 1000 * 60 * 30) { // 30 minutes
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        logger.debug('[useTasksQuery queryFn] Using local data for tasks.');
        return localData.map(task => ({
          ...task,
          priority: (task.priority === 'low' || task.priority === 'medium' || task.priority === 'high') 
            ? task.priority 
            : 'medium' as const
        }));
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
      return localData ? localData.map(task => ({
        ...task,
        priority: (task.priority === 'low' || task.priority === 'medium' || task.priority === 'high') 
          ? task.priority 
          : 'medium' as const
      })) : [];
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    gcTime: 1000 * 60 * 60, // 1 hour
    enabled: !!(subUserId || domUserId), // Only run if we have at least one user ID
  });

  return {
    ...queryResult,
    isUsingCachedData: false
  };
}
