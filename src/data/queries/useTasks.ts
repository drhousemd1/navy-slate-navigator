import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/lib/taskUtils"; // Assuming Task type includes user_id?: string
import { useAuth } from "@/contexts/auth";

export default function useTasksQuery() { // Renamed to avoid conflict
  const { user } = useAuth();

  return useQuery({ // Removed explicit <Task[], Error>
    queryKey: ["tasks", user?.id],
    queryFn: async (): Promise<Task[]> => { // Explicit Promise return type for queryFn
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("*") // Ensure this select matches the Task type, including priority as a specific enum
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Ensure the data from Supabase aligns with the Task type, especially for enum types like 'priority'
      // If Supabase returns priority as a generic string, it needs to be validated or cast carefully.
      // For now, we keep the direct cast, assuming the database stores priority compatibly.
      return (data || []) as Task[]; 
    },
    enabled: !!user?.id,
    staleTime: Infinity,
  });
}
