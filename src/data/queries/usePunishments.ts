
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PunishmentData } from "@/contexts/punishments/types";
import { useAuth } from "@/contexts/auth";

export default function usePunishmentsQuery() {
  const { user } = useAuth();

  const queryKey = ["punishments", user?.id] as const;

  const queryFn = async (): Promise<PunishmentData[]> => {
    // The user_id in the queryKey is already used to enable/disable the query.
    // If user or user.id is not available, queryFn won't run due to `enabled` option.
    // However, if it *does* run, user.id is guaranteed to be a string.
    const userId = user?.id;
    if (!userId) {
      return []; // Should not happen if 'enabled' works correctly
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
      icon_url: undefined, // Explicitly undefined as it's in PunishmentData but not fetched
      usage_data: undefined, // Explicitly undefined
      frequency_count: undefined, // Explicitly undefined
    })) as PunishmentData[]; // Still casting, but ensure mapped object aligns with PunishmentData
  };

  return useQuery<PunishmentData[], Error, PunishmentData[], typeof queryKey>({
    queryKey: queryKey,
    queryFn: queryFn,
    enabled: !!user?.id,
    staleTime: Infinity,
  });
}
