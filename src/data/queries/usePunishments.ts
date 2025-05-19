
/**
 * CENTRALIZED DATA LOGIC – DO NOT DUPLICATE OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import {
  loadPunishmentsFromDB,
  savePunishmentsToDB,
  getLastSyncTimeForPunishments,
  setLastSyncTimeForPunishments
} from "../indexedDB/useIndexedDB";
import { PunishmentData } from "@/contexts/punishments/types";

// Helper to process raw DB data into PunishmentData
const processPunishmentFromDb = (dbPunishment: any): PunishmentData => {
  return {
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
    icon_url: dbPunishment.icon_url, // Added from PunishmentData interface
    icon_color: dbPunishment.icon_color,
    focal_point_x: dbPunishment.focal_point_x,
    focal_point_y: dbPunishment.focal_point_y,
    usage_data: dbPunishment.usage_data || [], // Added from PunishmentData interface
    frequency_count: dbPunishment.frequency_count, // Added from PunishmentData interface
    created_at: dbPunishment.created_at,
    updated_at: dbPunishment.updated_at,
  };
};


export function usePunishments() {
  const queryResult = useQuery<PunishmentData[], Error>({
    queryKey: ["punishments"],
    queryFn: async (): Promise<PunishmentData[]> => { // Explicitly type queryFn return
      const localData = await loadPunishmentsFromDB(); // Already PunishmentData[] | null
      const lastSync = await getLastSyncTimeForPunishments();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        if (timeDiff < 1000 * 60 * 30) { // 30 minutes
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        console.log("Serving punishments from IndexedDB");
        return localData;
      }
      console.log("Fetching punishments from Supabase");
      const { data, error } = await supabase.from("punishments").select("*");
      if (error) throw error;

      if (data) {
        const punishmentsData = data.map(processPunishmentFromDb);
        await savePunishmentsToDB(punishmentsData);
        await setLastSyncTimeForPunishments(new Date().toISOString());
        return punishmentsData;
      }

      return localData || []; // Fallback to localData or empty array
    },
    staleTime: Infinity,
    gcTime: 3600000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false
  });

  return {
    ...queryResult,
    punishments: queryResult.data || [],
    isLoading: queryResult.isLoading,
    error: queryResult.error,
    refetchPunishments: queryResult.refetch
  };
}
