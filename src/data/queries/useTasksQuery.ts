
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, getLocalDateString } from '@/lib/taskUtils';
import { loadTasksFromDB, saveTasksToDB } from '@/data/indexedDB/useIndexedDB';
import { logQueryPerformance } from '@/lib/react-query-config';
import { useEffect, useState } from 'react';

export const TASKS_QUERY_KEY = ['tasks'];

async function fetchTasks(): Promise<Task[]> {
  const startTime = performance.now();
  console.log('[TasksQuery] Fetching tasks from the server');
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  const tasks = data.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    points: task.points,
    priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
    completed: task.completed,
    background_image_url: task.background_image_url,
    background_opacity: task.background_opacity,
    focal_point_x: task.focal_point_x,
    focal_point_y: task.focal_point_y,
    frequency: task.frequency as 'daily' | 'weekly',
    frequency_count: task.frequency_count,
    usage_data: Array.isArray(task.usage_data) 
      ? task.usage_data.map(val => typeof val === 'number' ? val : Number(val)) 
      : [0, 0, 0, 0, 0, 0, 0],
    icon_name: task.icon_name,
    icon_url: task.icon_url,
    icon_color: task.icon_color,
    highlight_effect: task.highlight_effect,
    title_color: task.title_color,
    subtext_color: task.subtext_color,
    calendar_color: task.calendar_color,
    last_completed_date: task.last_completed_date,
    created_at: task.created_at,
    updated_at: task.updated_at
  } as Task));

  // Special auto-reset logic for daily tasks
  const today = getLocalDateString();
  const tasksToReset = tasks.filter(task => 
    task.completed && 
    task.frequency === 'daily' && 
    task.last_completed_date !== today
  );

  if (tasksToReset.length > 0) {
    console.log(`[TasksQuery] Resetting ${tasksToReset.length} daily tasks that are not completed today`);
    
    const updates = tasksToReset.map(task => ({
      id: task.id,
      completed: false
    }));

    for (const update of updates) {
      await supabase
        .from('tasks')
        .update({ completed: false })
        .eq('id', update.id);
    }

    // Update tasks in memory rather than refetching
    const updatedTasks = tasks.map(task => {
      if (tasksToReset.some(resetTask => resetTask.id === task.id)) {
        return { ...task, completed: false };
      }
      return task;
    });
    
    // Save to IndexedDB
    await saveTasksToDB(updatedTasks);
    
    logQueryPerformance('TasksQuery', startTime, tasks.length);
    return updatedTasks;
  }
  
  // Save to IndexedDB
  await saveTasksToDB(tasks);
  
  logQueryPerformance('TasksQuery', startTime, tasks.length);
  return tasks;
}

export function useTasksQuery() {
  const [initialData, setInitialData] = useState<Task[] | undefined>(undefined);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  
  // Load initial data from IndexedDB
  useEffect(() => {
    async function loadInitialData() {
      try {
        const cachedTasks = await loadTasksFromDB();
        setInitialData(cachedTasks || []);
      } catch (err) {
        console.error('Error loading tasks from IndexedDB:', err);
      } finally {
        setIsLoadingInitial(false);
      }
    }
    
    loadInitialData();
  }, []);
  
  const query = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 1,
    // Only use initialData once it has been loaded from IndexedDB
    initialData: initialData,
    enabled: !isLoadingInitial, // Don't run query until initial loading is done
  });
  
  return {
    ...query,
    // Return cached data while waiting for IndexedDB to load
    data: query.data || initialData || [],
    // Only show loading state if there's no data at all
    isLoading: (query.isLoading || isLoadingInitial) && !initialData?.length
  };
}
