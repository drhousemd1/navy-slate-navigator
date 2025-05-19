
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PunishmentData } from "@/contexts/punishments/types";
import { useAuth } from "@/contexts/auth";

export default function usePunishmentsQuery() { // Renamed to avoid conflict with context hook if used in same file
  const { user } = useAuth();
  
  return useQuery({ // Removed explicit <PunishmentData[], Error>
    queryKey: ["punishments", user?.id],
    queryFn: async (): Promise<PunishmentData[]> => { // Explicit Promise return type for queryFn
      if (!user?.id) {
        return [];
      }
      
      const { data, error } = await supabase
        .from("punishments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      
      return (data || []) as PunishmentData[];
    },
    enabled: !!user?.id,
    staleTime: Infinity,
  });
}
