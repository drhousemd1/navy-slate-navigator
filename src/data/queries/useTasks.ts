
import { useQuery } from "@tanstack/react-query"; 
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/lib/taskUtils';
import {
  loadTasksFromDB,
  saveTasksToDB,
  getLastSyncTimeForTasks,
  setLastSyncTimeForTasks
} from "../indexedDB/useIndexedDB";

export function useTasks() {
  return useQuery<Task[], Error>({
    queryKey: ["tasks"],
    queryFn: async () => {
      const localData = await loadTasksFromDB() as Task[] | null;
      const lastSync = await getLastSyncTimeForTasks();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        if (timeDiff < 1000 * 60 * 30) { // 30 minutes
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        return localData;
      }

      const { data, error } = await supabase.from("tasks").select("*");
      if (error) throw error;

      if (data) {
        const tasksData = data.map(task => ({
          ...task,
          priority: task.priority || 'medium',
          frequency: task.frequency || 'daily',
          frequency_count: task.frequency_count || 1,
          usage_data: task.usage_data || Array(7).fill(0)
        })) as Task[];
        
        await saveTasksToDB(tasksData);
        await setLastSyncTimeForTasks(new Date().toISOString());
        return tasksData;
      }

      return localData || [];
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}
