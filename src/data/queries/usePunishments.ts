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
import { PunishmentData } from "@/contexts/punishments/types"; // Import PunishmentData type

// Interface for the raw item structure from Supabase before mapping
interface SupabasePunishmentItem {
  id: string;
  title: string;
  description?: string | null;
  points: number;
  dom_points?: number | null;
  dom_supply?: number | null;
  background_image_url?: string | null;
  background_opacity?: number | null;
  icon_name?: string | null;
  title_color?: string | null;
  subtext_color?: string | null;
  calendar_color?: string | null;
  icon_color?: string | null;
  highlight_effect?: boolean | null;
  focal_point_x?: number | null;
  focal_point_y?: number | null;
  created_at: string;
  updated_at: string;
  icon_url?: string | null; // This field is in the mapping logic but not in the DB schema for 'punishments' table.
                           // Keeping it here to match existing mapping, assuming it might be populated
                           // by view/join logic or is an oversight to be addressed separately.
}


export function usePunishments() {
  return useQuery<PunishmentData[], Error>({ // Use PunishmentData type
    queryKey: ["punishments"],
    queryFn: async () => {
      const localData = await loadPunishmentsFromDB() as PunishmentData[] | null;
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
        // Process data to ensure it matches PunishmentData, especially new non-nullable fields
        const punishmentsData = data.map(item => {
          const typedItem = item as SupabasePunishmentItem; // Changed from Record<string, any>
          return {
            id: typedItem.id,
            title: typedItem.title,
            description: typedItem.description ?? '', 
            points: typedItem.points,
            dom_points: typedItem.dom_points ?? 0, 
            dom_supply: typedItem.dom_supply ?? 0, 
            background_image_url: typedItem.background_image_url,
            background_opacity: typedItem.background_opacity ?? 50, 
            icon_name: typedItem.icon_name,
            title_color: typedItem.title_color ?? '#FFFFFF', 
            subtext_color: typedItem.subtext_color ?? '#8E9196', 
            calendar_color: typedItem.calendar_color ?? '#ea384c', 
            icon_color: typedItem.icon_color ?? '#ea384c', 
            highlight_effect: typedItem.highlight_effect ?? false, 
            focal_point_x: typedItem.focal_point_x ?? 50, 
            focal_point_y: typedItem.focal_point_y ?? 50, 
            created_at: typedItem.created_at,
            updated_at: typedItem.updated_at,
            icon_url: typedItem.icon_url || null, 
            // usage_data and frequency_count are typically derived or added later, not directly from this base query.
            // If they are part of the core PunishmentData type and expected here, ensure they have defaults.
            // usage_data: typedItem.usage_data || Array(7).fill(0), // Example if needed
            // frequency_count: typedItem.frequency_count || 0, // Example if needed
          } as PunishmentData; // Cast to PunishmentData
        });
        
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
