
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { Rule } from "@/data/interfaces/Rule"; // Canonical Rule interface
import {
  loadRulesFromDB,
  saveRulesToDB,
  getLastSyncTimeForRules,
  setLastSyncTimeForRules
} from "../indexedDB/rulesIndexedDB"; // Updated import path

// Helper to process raw DB data into Rule
const processRuleFromDb = (dbRule: any): Rule => {
  return {
    id: dbRule.id,
    title: dbRule.title,
    description: dbRule.description,
    points_deducted: dbRule.points_deducted,
    dom_points_deducted: dbRule.dom_points_deducted,
    priority: dbRule.priority || 'medium',
    background_image_url: dbRule.background_image_url,
    background_opacity: dbRule.background_opacity ?? 100,
    icon_url: dbRule.icon_url,
    icon_name: dbRule.icon_name,
    title_color: dbRule.title_color || '#FFFFFF',
    subtext_color: dbRule.subtext_color || '#8E9196',
    calendar_color: dbRule.calendar_color || '#7E69AB',
    icon_color: dbRule.icon_color || '#9b87f5',
    highlight_effect: dbRule.highlight_effect ?? false,
    focal_point_x: dbRule.focal_point_x ?? 50,
    focal_point_y: dbRule.focal_point_y ?? 50,
    frequency: dbRule.frequency || 'daily',
    frequency_count: dbRule.frequency_count || 1,
    usage_data: Array.isArray(dbRule.usage_data) && dbRule.usage_data.length === 7 
                  ? dbRule.usage_data.map((val: any) => Number(val) || 0) 
                  : Array(7).fill(0),
    created_at: dbRule.created_at,
    updated_at: dbRule.updated_at,
    user_id: dbRule.user_id,
  };
};

export function useRules() {
  return useQuery<Rule[], Error>({
    queryKey: ["rules"], 
    queryFn: async (): Promise<Rule[]> => {
      const localData = await loadRulesFromDB(); // Should return Rule[] | null
      const lastSync = await getLastSyncTimeForRules();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        if (timeDiff < 1000 * 60 * 30) { // 30 minutes
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        console.log("Serving rules from IndexedDB");
        return localData; // localData is already Rule[]
      }
      console.log("Fetching rules from Supabase");
      const { data, error } = await supabase.from("rules").select("*").order('created_at', { ascending: true });
      if (error) throw error;

      if (data) {
        const rulesData = data.map(processRuleFromDb); // Ensures data conforms to Rule interface
        await saveRulesToDB(rulesData);
        await setLastSyncTimeForRules(new Date().toISOString());
        return rulesData;
      }

      return localData || []; // Fallback to localData or empty array
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}
