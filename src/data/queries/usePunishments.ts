
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

// Define a proper interface for Punishment that includes all needed fields
interface Punishment {
  id: string;
  title: string;
  description?: string | null;
  points: number;
  dom_points?: number | null;
  dom_supply: number;
  background_image_url?: string | null;
  background_opacity: number;
  icon_url?: string | null;
  icon_name?: string | null;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  usage_data?: number[];
  frequency_count?: number;
  created_at?: string;
  updated_at?: string;
}

export function usePunishments() {
  return useQuery<Punishment[], Error>({
    queryKey: ["punishments"],
    queryFn: async () => {
      const localData = await loadPunishmentsFromDB() as Punishment[] | null;
      const lastSync = await getLastSyncTimeForPunishments();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        if (timeDiff < 1000 * 60 * 30) { // 30 minutes
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        return localData;
      }

      const { data, error } = await supabase.from("punishments").select("*");
      if (error) throw error;

      if (data) {
        // Process data to ensure it has all the necessary fields
        const punishmentsData = data.map(item => ({
          ...item,
          icon_url: item.icon_url || null,
          usage_data: item.usage_data || Array(7).fill(0),
          frequency_count: item.frequency_count || 0
        })) as Punishment[];
        
        await savePunishmentsToDB(punishmentsData);
        await setLastSyncTimeForPunishments(new Date().toISOString());
        return punishmentsData;
      }

      return localData || [];
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}
