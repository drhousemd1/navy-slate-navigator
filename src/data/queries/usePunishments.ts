
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import {
  loadPunishmentsFromDB,
  savePunishmentsToDB,
  getLastSyncTimeForPunishments,
  setLastSyncTimeForPunishments
} from "../indexedDB/useIndexedDB";
import { PunishmentData } from "@/contexts/punishments/types";
import { Database } from "@/integrations/supabase/types"; // Assuming this is where Supabase types are generated
import { useAuth } from "@/contexts/auth";

type DbPunishment = Database['public']['Tables']['punishments']['Row'];

export function usePunishments() {
  const { user } = useAuth();
  const queryKey = ["punishments", user?.id] as const;

  const queryFn = async (): Promise<PunishmentData[]> => {
    const userId = user?.id;
    if (!userId) return [];

    const localData = await loadPunishmentsFromDB();
    const lastSync = await getLastSyncTimeForPunishments();
    let shouldFetch = true;

    if (lastSync) {
      const timeDiff = Date.now() - new Date(lastSync).getTime();
      if (timeDiff < 1000 * 60 * 30) { // 30 minutes
        shouldFetch = false;
      }
    }

    if (!shouldFetch && localData) {
      console.log("Serving punishments from IndexedDB");
      return localData;
    }

    console.log("Fetching punishments from Supabase");
    // Assuming 'user_id' is NOT on the 'punishments' table as per schema.
    // If it should be user-specific, the table schema and this query need an update.
    const { data, error } = await supabase.from("punishments").select("*");
    if (error) throw error;

    if (data) {
      const punishmentsData = data.map((p: DbPunishment) => ({
        // Map fields present in DbPunishment
        id: p.id,
        title: p.title,
        description: p.description,
        points: p.points,
        dom_points: p.dom_points,
        dom_supply: p.dom_supply,
        background_image_url: p.background_image_url,
        background_opacity: p.background_opacity,
        title_color: p.title_color,
        subtext_color: p.subtext_color,
        calendar_color: p.calendar_color,
        highlight_effect: p.highlight_effect,
        icon_name: p.icon_name,
        icon_color: p.icon_color, // This exists on DbPunishment
        focal_point_x: p.focal_point_x,
        focal_point_y: p.focal_point_y,
        created_at: p.created_at,
        updated_at: p.updated_at,
        // Fields for PunishmentData that are NOT on DbPunishment and should be undefined
        icon_url: undefined, // punishments table does NOT have icon_url in the provided schema
        usage_data: undefined, // punishments table does NOT have usage_data
        frequency_count: undefined, // punishments table does NOT have frequency_count
      })) as PunishmentData[];
      await savePunishmentsToDB(punishmentsData);
      await setLastSyncTimeForPunishments(new Date().toISOString());
      return punishmentsData;
    }

    return localData || []; // Fallback to localData or empty array
  };

  const queryOptions: UseQueryOptions<PunishmentData[], Error, PunishmentData[], typeof queryKey> = {
    queryKey: queryKey,
    queryFn: queryFn,
    enabled: !!user?.id,
    staleTime: Infinity,
    gcTime: 3600000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false
  };
  
  const queryResult = useQuery(queryOptions);

  return {
    ...queryResult,
    punishments: queryResult.data || [], // Ensure this is always an array
    isLoading: queryResult.isLoading,
    error: queryResult.error,
    refetchPunishments: queryResult.refetch
  };
}
