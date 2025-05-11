/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { Rule } from "@/data/interfaces/Rule";
import { loadRulesFromDB, saveRulesToDB } from "../indexedDB/useIndexedDB";

// Fetch rules from Supabase
const fetchRules = async (): Promise<Rule[]> => {
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    throw error;
  }
  
  // Transform data to ensure it matches the Rule interface type
  const validatedRules: Rule[] = (data || []).map(rule => ({
    ...rule,
    priority: rule.priority as 'low' | 'medium' | 'high', 
    frequency: rule.frequency as 'daily' | 'weekly',
    usage_data: Array.isArray(rule.usage_data) ? rule.usage_data as number[] : [],
    // Ensure all required fields are cast to the right types
    id: rule.id,
    title: rule.title,
    description: rule.description || "",
    created_at: rule.created_at,
    updated_at: rule.updated_at,
    title_color: rule.title_color,
    subtext_color: rule.subtext_color,
    calendar_color: rule.calendar_color,
    icon_color: rule.icon_color,
    background_opacity: rule.background_opacity,
    focal_point_x: rule.focal_point_x,
    focal_point_y: rule.focal_point_y,
    highlight_effect: rule.highlight_effect,
    frequency_count: rule.frequency_count
  }));
  
  // Save to IndexedDB for offline access
  await saveRulesToDB(validatedRules);
  
  return validatedRules;
};

// Hook for accessing rules
export function useRules() {
  return useQuery({
    queryKey: ['rules'],
    queryFn: fetchRules,
    initialData: [], 
    staleTime: Infinity,
    placeholderData: () => {
      // Return empty array as placeholder until the real data loads
      return [];
    },
    // Use this option to control how long to keep data in cache
    gcTime: 5 * 60 * 1000 // 5 minutes
  });
}
