
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PunishmentData } from "@/contexts/punishments/types";
import { useAuth } from "@/contexts/auth";

export default function usePunishmentsQuery() {
  const { user } = useAuth();

  return useQuery<PunishmentData[], Error, PunishmentData[], readonly ["punishments", string | undefined]>({
    queryKey: ["punishments", user?.id],
    queryFn: async (): Promise<PunishmentData[]> => {
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from("punishments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Explicit mapping to ensure type alignment and help TS compiler
      return (data || []).map(dbPunishment => ({
        id: dbPunishment.id,
        title: dbPunishment.title,
        description: dbPunishment.description,
        points: dbPunishment.points,
        dom_points: dbPunishment.dom_points,
        dom_supply: dbPunishment.dom_supply,
        background_image_url: dbPunishment.background_image_url,
        background_opacity: dbPunishment.background_opacity,
        title_color: dbPunishment.title_color,
        subtext_color: dbPunishment.subtext_color,
        calendar_color: dbPunishment.calendar_color,
        highlight_effect: dbPunishment.highlight_effect,
        icon_name: dbPunishment.icon_name,
        icon_url: dbPunishment.icon_url,
        icon_color: dbPunishment.icon_color,
        focal_point_x: dbPunishment.focal_point_x,
        focal_point_y: dbPunishment.focal_point_y,
        // Ensure these fields exist on dbPunishment or handle defaults if they are part of PunishmentData
        usage_data: dbPunishment.usage_data, // Cast or default if necessary
        frequency_count: dbPunishment.frequency_count, // Cast or default if necessary
        created_at: dbPunishment.created_at,
        updated_at: dbPunishment.updated_at,
      })) as PunishmentData[];
    },
    enabled: !!user?.id,
    staleTime: Infinity,
  });
}

