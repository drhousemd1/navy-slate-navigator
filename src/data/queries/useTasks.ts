
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Task, TaskPriority } from "@/lib/taskUtils"; // Assuming Task type includes user_id?: string
import { useAuth } from "@/contexts/auth";

export default function useTasksQuery() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tasks", user?.id],
    queryFn: async (): Promise<Task[]> => { // Explicit Promise return type
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id) // Assuming tasks are user-specific
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Ensure the data from Supabase aligns with the Task type
      // Especially for enum types like 'priority'.
      // Perform a more robust transformation if direct casting is problematic.
      return (data || []).map(dbTask => ({
        ...dbTask,
        priority: dbTask.priority as TaskPriority, // Explicit cast for priority
      })) as Task[];
    },
    enabled: !!user?.id,
    staleTime: Infinity,
  });
}
