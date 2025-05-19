
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PunishmentData } from "@/contexts/punishments/types";
import { useAuth } from "@/contexts/auth";

export default function usePunishmentsQuery() {
  const { user } = useAuth();

  const queryKey = ["punishments", user?.id] as const;

  const queryFn = async (): Promise<PunishmentData[]> => {
    const userId = user?.id;
    if (!userId) {
      return []; 
    }

    const { data, error } = await supabase
      .from("punishments")
      .select("*")
      .eq("user_id", userId) // Note: 'user_id' column is not in the provided 'punishments' table schema. This might be an issue for data filtering.
      .order("created_at", { ascending: false });

    if (error) throw error;

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
      icon_color: dbPunishment.icon_color,
      focal_point_x: dbPunishment.focal_point_x,
      focal_point_y: dbPunishment.focal_point_y,
      created_at: dbPunishment.created_at,
      updated_at: dbPunishment.updated_at,
      // Ensure all properties match PunishmentData, adding undefined for optional ones if not in dbPunishment
      icon_url: dbPunishment.icon_url || undefined, 
      usage_data: dbPunishment.usage_data || undefined, 
      frequency_count: dbPunishment.frequency_count || undefined, 
    })) as PunishmentData[];
  };

  return useQuery({ // Removed explicit generic arguments
    queryKey: queryKey,
    queryFn: queryFn,
    enabled: !!user?.id,
    staleTime: Infinity,
  });
}
