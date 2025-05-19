
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PunishmentData } from "@/contexts/punishments/types";
import { useAuth } from "@/contexts/auth";

export default function usePunishmentsQuery() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["punishments", user?.id],
    queryFn: async (): Promise<PunishmentData[]> => { // Explicit Promise return type
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from("punishments")
        .select("*")
        .eq("user_id", user.id) // Assuming punishments are user-specific
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []) as PunishmentData[]; // Cast if necessary, ensure data structure matches
    },
    enabled: !!user?.id,
    staleTime: Infinity,
  });
}
