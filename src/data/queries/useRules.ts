
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Rule } from "@/data/interfaces/Rule";
import { useAuth } from "@/contexts/auth";

export default function useRules() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["rules"],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from("rules")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Rule[];
    },
    staleTime: Infinity,
  });
}
