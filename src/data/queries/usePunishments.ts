
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

// The Punishment interface now directly uses PunishmentData from types.ts
// interface Punishment { ... } // This can be removed if PunishmentData is used directly.

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
          const typedItem = item as any; 
          return {
            id: typedItem.id,
            title: typedItem.title,
            description: typedItem.description ?? '', // Ensure default if DB somehow returns null
            points: typedItem.points,
            dom_points: typedItem.dom_points ?? 0, // Ensure default
            dom_supply: typedItem.dom_supply ?? 0, // Ensure default
            background_image_url: typedItem.background_image_url,
            background_opacity: typedItem.background_opacity ?? 50, // Ensure default
            icon_name: typedItem.icon_name,
            title_color: typedItem.title_color ?? '#FFFFFF', // Ensure default
            subtext_color: typedItem.subtext_color ?? '#8E9196', // Ensure default
            calendar_color: typedItem.calendar_color ?? '#ea384c', // Ensure default
            icon_color: typedItem.icon_color ?? '#ea384c', // Ensure default
            highlight_effect: typedItem.highlight_effect ?? false, // Ensure default
            focal_point_x: typedItem.focal_point_x ?? 50, // Ensure default
            focal_point_y: typedItem.focal_point_y ?? 50, // Ensure default
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
