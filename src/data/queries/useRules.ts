
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { Rule } from "@/data/interfaces/Rule";
import {
  loadRulesFromDB,
  saveRulesToDB,
  getLastSyncTimeForRules,
  setLastSyncTimeForRules
} from "../indexedDB/useIndexedDB";
import { useAuth } from "@/contexts/auth"; // Assuming rules are user-specific

export function useRulesQuery() { // Renamed to useRulesQuery to avoid conflict with context hook
  const { user } = useAuth();
  const profileId = user?.id;

  const queryKey = ["rules", profileId] as const;

  const queryFn = async (): Promise<Rule[]> => {
    if (!profileId) return []; // Do not fetch if no profileId

    const localData = await loadRulesFromDB();
    const lastSync = await getLastSyncTimeForRules();
    let shouldFetch = true;

    if (lastSync) {
      const timeDiff = Date.now() - new Date(lastSync).getTime();
      if (timeDiff < 1000 * 60 * 30) { // 30 minutes cache
        shouldFetch = false;
      }
    }

    if (!shouldFetch && localData) {
      console.log("Serving rules from IndexedDB");
      return localData;
    }

    console.log("Fetching rules from Supabase for profileId:", profileId);
    const { data, error } = await supabase
      .from("rules")
      .select("*")
      .eq("user_id", profileId); // Assuming rules have a user_id column

    if (error) {
      console.error("Error fetching rules:", error);
      throw error;
    }

    if (data) {
      const rulesData = data as Rule[];
      await saveRulesToDB(rulesData);
      await setLastSyncTimeForRules(new Date().toISOString());
      return rulesData;
    }

    return localData || []; // Fallback to localData or empty array if fetch fails but local exists
  };

  const queryOptions: UseQueryOptions<Rule[], Error, Rule[], typeof queryKey> = {
    queryKey: queryKey,
    queryFn: queryFn,
    enabled: !!profileId, // Only run query if profileId exists
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    gcTime: 1000 * 60 * 30, // 30 minutes
  };
  
  return useQuery(queryOptions);
}
