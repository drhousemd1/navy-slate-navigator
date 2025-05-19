
/**
 * CENTRALIZED DATA LOGIC – DO NOT DUPLICATE OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskPriority, TaskFrequency } from "@/data/tasks/types"; // Ensure this is the canonical Task type
import {
  loadTasksFromDB,
  saveTasksToDB,
  getLastSyncTimeForTasks,
  setLastSyncTimeForTasks
} from "../indexedDB/tasksIndexedDB"; // Updated import path
import { processTasksWithRecurringLogic } from "@/lib/taskUtils"; // For applying daily resets etc.

const processDbTaskToAppTask = (dbTask: any): Task => {
  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description,
    points: dbTask.points,
    priority: (dbTask.priority || 'medium') as TaskPriority,
    completed: dbTask.completed,
    background_image_url: dbTask.background_image_url,
    background_opacity: dbTask.background_opacity ?? 100,
    focal_point_x: dbTask.focal_point_x ?? 50,
    focal_point_y: dbTask.focal_point_y ?? 50,
    frequency: (dbTask.frequency || 'daily') as TaskFrequency,
    frequency_count: dbTask.frequency_count || 1,
    usage_data: Array.isArray(dbTask.usage_data) && dbTask.usage_data.length === 7 
                  ? dbTask.usage_data.map((val: any) => Number(val) || 0) 
                  : Array(7).fill(0),
    icon_url: dbTask.icon_url,
    icon_name: dbTask.icon_name,
    icon_color: dbTask.icon_color || '#9b87f5',
    highlight_effect: dbTask.highlight_effect ?? false,
    title_color: dbTask.title_color || '#FFFFFF',
    subtext_color: dbTask.subtext_color || '#8E9196',
    calendar_color: dbTask.calendar_color || '#7E69AB',
    last_completed_date: dbTask.last_completed_date,
    created_at: dbTask.created_at,
    updated_at: dbTask.updated_at,
    week_identifier: dbTask.week_identifier,
    background_images: dbTask.background_images, // This should now match the Task type
  };
};

export function useTasks() {
  return useQuery<Task[], Error>({
    queryKey: ["tasks"],
    queryFn: async (): Promise<Task[]> => {
      const localData = await loadTasksFromDB(); 
      const lastSync = await getLastSyncTimeForTasks();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        if (timeDiff < 1000 * 60 * 30) { // 30 minutes
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        return processTasksWithRecurringLogic(localData.map(processDbTaskToAppTask));
      }

      const { data, error } = await supabase.from("tasks").select("*").order('created_at', { ascending: true });
      if (error) throw error;

      if (data) {
        const processedServerTasks = data.map(processDbTaskToAppTask);
        const tasksToStore = processTasksWithRecurringLogic(processedServerTasks);
        await saveTasksToDB(tasksToStore);
        await setLastSyncTimeForTasks(new Date().toISOString());
        return tasksToStore;
      }
      if (localData) {
        return processTasksWithRecurringLogic(localData.map(processDbTaskToAppTask));
      }
      return []; 
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, 
    refetchOnWindowFocus: false, 
    refetchOnReconnect: false,
    refetchOnMount: false, 
  });
}
