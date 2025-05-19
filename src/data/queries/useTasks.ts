
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/lib/taskUtils";
import { useAuth } from "@/contexts/auth";

export default function useTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Task[];
    },
    staleTime: Infinity,
  });
}
