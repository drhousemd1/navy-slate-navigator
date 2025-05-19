
/**
 * CENTRALIZED DATA LOGIC – DO NOT DUPLICATE OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { Task } from "@/data/tasks/types"; // Ensure this is the canonical Task type
import {
  loadTasksFromDB,
  saveTasksToDB,
  getLastSyncTimeForTasks,
  setLastSyncTimeForTasks
} from "../indexedDB/useIndexedDB";
import { processTasksWithRecurringLogic } from "@/lib/taskUtils"; // For applying daily resets etc.

// It's good practice to have a processor function if DB shape differs from client shape
// or if client-side defaults/transformations are needed.
const processDbTaskToAppTask = (dbTask: any): Task => {
  // This should align with processTaskFromDb in taskUtils or be the sole source of truth for this transformation
  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description,
    points: dbTask.points,
    priority: dbTask.priority || 'medium',
    completed: dbTask.completed,
    background_image_url: dbTask.background_image_url,
    background_opacity: dbTask.background_opacity,
    focal_point_x: dbTask.focal_point_x,
    focal_point_y: dbTask.focal_point_y,
    frequency: dbTask.frequency || 'daily',
    frequency_count: dbTask.frequency_count || 1,
    usage_data: Array.isArray(dbTask.usage_data) && dbTask.usage_data.length === 7 
                  ? dbTask.usage_data.map((val: any) => Number(val) || 0) 
                  : Array(7).fill(0),
    icon_url: dbTask.icon_url,
    icon_name: dbTask.icon_name,
    icon_color: dbTask.icon_color,
    highlight_effect: dbTask.highlight_effect,
    title_color: dbTask.title_color,
    subtext_color: dbTask.subtext_color,
    calendar_color: dbTask.calendar_color,
    last_completed_date: dbTask.last_completed_date,
    created_at: dbTask.created_at,
    updated_at: dbTask.updated_at,
    week_identifier: dbTask.week_identifier,
    background_images: dbTask.background_images,
  };
};

export function useTasks() {
  return useQuery<Task[], Error>({
    queryKey: ["tasks"],
    queryFn: async (): Promise<Task[]> => {
      const localData = await loadTasksFromDB(); // Type from IndexedDB should be Task[]
      const lastSync = await getLastSyncTimeForTasks();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        if (timeDiff < 1000 * 60 * 30) { // 30 minutes
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        // Apply recurring logic even to local data to ensure UI consistency
        return processTasksWithRecurringLogic(localData.map(processDbTaskToAppTask));
      }

      const { data, error } = await supabase.from("tasks").select("*").order('created_at', { ascending: true });
      if (error) throw error;

      if (data) {
        const processedServerTasks = data.map(processDbTaskToAppTask);
        // Apply recurring logic after fetching from server
        const tasksToStore = processTasksWithRecurringLogic(processedServerTasks);
        await saveTasksToDB(tasksToStore);
        await setLastSyncTimeForTasks(new Date().toISOString());
        return tasksToStore;
      }
      // If server fetch fails but local data exists, process and return it
      if (localData) {
        return processTasksWithRecurringLogic(localData.map(processDbTaskToAppTask));
      }
      return []; // Fallback to empty array
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false, // Consider user preference or app needs
    refetchOnReconnect: false,
    refetchOnMount: false, // Data is loaded via persister or initial fetch
  });
}
