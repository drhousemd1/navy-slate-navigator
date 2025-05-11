
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
    usage_data: rule.usage_data || [],
    // Ensure all required fields are cast to the right types
    id: rule.id,
    title: rule.title,
    description: rule.description || "",
    created_at: rule.created_at,
    updated_at: rule.updated_at
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
    initialData: [], // Fixed: Direct array instead of function
    staleTime: Infinity,
    placeholderData: async () => {
      try {
        const cachedRules = await loadRulesFromDB();
        return cachedRules || [];
      } catch (error) {
        console.error("Error loading cached rules:", error);
        return [];
      }
    },
  });
}
