
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PunishmentData } from "@/contexts/punishments/types";
import { useAuth } from "@/contexts/auth";

export default function usePunishments() {
  const { user } = useAuth();
  
  return useQuery<PunishmentData[], Error>({ // Explicitly type useQuery
    queryKey: ["punishments"],
    queryFn: async (): Promise<PunishmentData[]> => { // Explicitly type queryFn return
      if (!user?.id) {
        return [];
      }
      
      const { data, error } = await supabase
        .from("punishments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      return (data || []) as PunishmentData[]; // Keep cast
    },
    staleTime: Infinity,
  });
}
