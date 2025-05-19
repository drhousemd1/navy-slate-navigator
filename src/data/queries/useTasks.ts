
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/lib/taskUtils";
import { useAuth } from "@/contexts/auth";

export default function useTasks() {
  const { user } = useAuth();

  return useQuery<Task[], Error>({
    queryKey: ["tasks"],
    queryFn: async (): Promise<Task[]> => {
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Task[]; // Workaround for deep type instantiation
    },
    staleTime: Infinity,
  });
}

