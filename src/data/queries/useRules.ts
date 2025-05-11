
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { Rule } from "@/data/interfaces/Rule";
import { loadRulesFromDB, saveRulesToDB } from "../indexeddb/useIndexedDB";

// Fetch rules from Supabase
const fetchRules = async (): Promise<Rule[]> => {
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    throw error;
  }
  
  // Save to IndexedDB for offline access
  await saveRulesToDB(data || []);
  
  return data || [];
};

// Hook for accessing rules
export function useRules() {
  return useQuery({
    queryKey: ['rules'],
    queryFn: fetchRules,
    initialData: async () => {
      const cachedRules = await loadRulesFromDB();
      return cachedRules || [];
    },
    staleTime: Infinity,
  });
}
