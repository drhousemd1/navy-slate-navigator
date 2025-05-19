
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/lib/taskUtils";
import { useAuth } from "@/contexts/auth";

export default function useTasks() {
  const { user } = useAuth();

  return useQuery<Task[], Error>({ // Explicitly type useQuery
    queryKey: ["tasks"],
    queryFn: async (): Promise<Task[]> => { // Explicitly type queryFn return
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Task[]; // Keep cast here, but primary typing is on useQuery/queryFn
    },
    staleTime: Infinity,
  });
}
