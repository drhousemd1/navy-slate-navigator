
import { useQuery, UseQueryOptions } from "@tanstack/react-query"; // Changed from usePersistentQuery
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/data/tasks/types'; // Ensure Task interface is correct
import {
  loadTasksFromDB,
  saveTasksToDB,
  getLastSyncTimeForTasks,
  setLastSyncTimeForTasks
} from "../indexedDB/useIndexedDB";
import { Database } from "@/integrations/supabase/types";

type DbTask = Database['public']['Tables']['tasks']['Row'];

export function useTasks() {
  const queryKey = ["tasks"] as const;

  const queryFn = async (): Promise<Task[]> => {
    const localData = await loadTasksFromDB();
    const lastSync = await getLastSyncTimeForTasks();
    let shouldFetch = true;

    if (lastSync) {
      const timeDiff = Date.now() - new Date(lastSync).getTime();
      if (timeDiff < 1000 * 60 * 30) { // 30 minutes
        shouldFetch = false;
      }
    }

    if (!shouldFetch && localData) {
      console.log("Serving tasks from IndexedDB");
      return localData;
    }
    
    console.log("Fetching tasks from Supabase");
    const { data, error } = await supabase.from("tasks").select("*");
    if (error) throw error;

    if (data) {
      // Explicitly map to Task interface
      const tasksData = data.map((t: DbTask) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        points: t.points,
        priority: t.priority as Task['priority'],
        completed: t.completed,
        background_image_url: t.background_image_url,
        background_opacity: t.background_opacity,
        focal_point_x: t.focal_point_x,
        focal_point_y: t.focal_point_y,
        frequency: t.frequency as Task['frequency'],
        frequency_count: t.frequency_count,
        usage_data: Array.isArray(t.usage_data) ? t.usage_data : (typeof t.usage_data === 'string' ? JSON.parse(t.usage_data) : []),
        icon_url: t.icon_url,
        icon_name: t.icon_name,
        icon_color: t.icon_color,
        highlight_effect: t.highlight_effect,
        title_color: t.title_color,
        subtext_color: t.subtext_color,
        calendar_color: t.calendar_color,
        last_completed_date: t.last_completed_date,
        created_at: t.created_at,
        updated_at: t.updated_at,
        // user_id: t.user_id, // if tasks are user-specific and user_id exists on the table
      })) as Task[];
      await saveTasksToDB(tasksData);
      await setLastSyncTimeForTasks(new Date().toISOString());
      return tasksData;
    }
    return localData || []; // Fallback to localData or empty array
  };
  
  const queryOptions: UseQueryOptions<Task[], Error, Task[], typeof queryKey> = {
    queryKey: queryKey,
    queryFn: queryFn,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    gcTime: 1000 * 60 * 30, // 30 minutes
  };

  return useQuery(queryOptions);
}
