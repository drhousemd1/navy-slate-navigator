
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/lib/rewardUtils';
import { loadRewardsFromDB, saveRewardsToDB } from '@/data/indexedDB/useIndexedDB';
import { logQueryPerformance } from '@/lib/react-query-config';
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';

export const REWARDS_QUERY_KEY = ['rewards'];

// Maximum number of retries for fetching data
const MAX_RETRIES = 3;

// Exponential backoff delay for retries (in ms)
const getBackoffDelay = (retryAttempt: number) => Math.min(1000 * (2 ** retryAttempt), 15000);

async function fetchRewards(): Promise<Reward[]> {
  const startTime = performance.now();
  console.log('[RewardsQuery] Fetching rewards from the server');
  
  // Implement retry logic with exponential backoff
  let retries = 0;
  let lastError: any = null;
  
  while (retries < MAX_RETRIES) {
    try {
      // Add query timeout for better control
      // This prevents long-running queries from blocking
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 10000); // 10 second timeout
      });
      
      const queryPromise = supabase
        .from('rewards')
        .select('*')
        .order('created_at', { ascending: false });
        
      // Race between the query and the timeout
      const { data, error } = await Promise.race([
        queryPromise,
        timeoutPromise.then(() => { 
          throw new Error('Query timeout');
        })
      ]) as any;
      
      if (error) {
        console.error(`[RewardsQuery] Error attempt ${retries + 1}:`, error);
        lastError = error;
        retries++;
        if (retries < MAX_RETRIES) {
          // Wait before retrying with exponential backoff
          const delay = getBackoffDelay(retries);
          console.log(`[RewardsQuery] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
      
      const rewards = data.map(reward => ({
        id: reward.id,
        title: reward.title,
        description: reward.description,
        cost: reward.cost,
        supply: reward.supply,
        background_image_url: reward.background_image_url,
        background_opacity: reward.background_opacity,
        focal_point_x: reward.focal_point_x,
        focal_point_y: reward.focal_point_y,
        icon_name: reward.icon_name,
        icon_color: reward.icon_color,
        title_color: reward.title_color,
        subtext_color: reward.subtext_color,
        calendar_color: reward.calendar_color,
        highlight_effect: reward.highlight_effect,
        is_dom_reward: reward.is_dom_reward || false, // Ensure is_dom_reward always has a value
        created_at: reward.created_at,
        updated_at: reward.updated_at
      } as Reward));
      
      // Save to IndexedDB
      await saveRewardsToDB(rewards);
      
      logQueryPerformance('RewardsQuery', startTime, rewards.length);
      return rewards;
    } catch (err: any) {
      lastError = err;
      retries++;
      
      if (retries < MAX_RETRIES) {
        // Wait before retrying with exponential backoff
        const delay = getBackoffDelay(retries);
        console.log(`[RewardsQuery] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`[RewardsQuery] Failed after ${MAX_RETRIES} attempts:`, err);
        throw err;
      }
    }
  }
  
  // This should never be reached due to the throw in the loop
  throw lastError || new Error('Unknown error fetching rewards');
}

export function useRewardsQuery() {
  const [initialData, setInitialData] = useState<Reward[] | undefined>(undefined);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  
  // Load initial data from IndexedDB
  useEffect(() => {
    async function loadInitialData() {
      try {
        const cachedRewards = await loadRewardsFromDB();
        setInitialData(cachedRewards || []);
      } catch (err) {
        console.error('Error loading rewards from IndexedDB:', err);
      } finally {
        setIsLoadingInitial(false);
      }
    }
    
    loadInitialData();
  }, []);
  
  const query = useQuery({
    queryKey: REWARDS_QUERY_KEY,
    queryFn: fetchRewards,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 2, // Additional retries at React Query level
    // Only use initialData once it has been loaded from IndexedDB
    initialData: initialData,
    enabled: !isLoadingInitial, // Don't run query until initial loading is done
    meta: {
      errorHandler: (error: any) => {
        console.error('[RewardsQuery] Error in React Query:', error);
        // Only show error toast if there's no cached data
        if (!initialData?.length) {
          toast({
            title: "Error loading rewards",
            description: "Could not fetch the latest rewards. " + 
              (error?.message?.includes("timeout") 
                ? "The server is taking too long to respond."
                : "Please try again later."),
            variant: "destructive"
          });
        } else {
          // Silent toast if we have cached data
          console.log('[RewardsQuery] Using cached data due to fetch error');
        }
      }
    }
  });
  
  // Add error handling in the component itself instead of in the query options
  useEffect(() => {
    if (query.error && query.meta?.errorHandler) {
      (query.meta.errorHandler as Function)(query.error);
    }
  }, [query.error, query.meta]);
  
  return {
    ...query,
    // Return cached data while waiting for IndexedDB to load
    data: query.data || initialData || [],
    // Only show loading state if there's no data at all
    isLoading: (query.isLoading || isLoadingInitial) && !initialData?.length,
    // Show error only if we don't have any data to show
    error: initialData?.length ? null : query.error
  };
}
