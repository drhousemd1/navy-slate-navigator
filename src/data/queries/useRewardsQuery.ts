
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

export const REWARDS_QUERY_KEY = ['rewards'];

async function fetchRewards(): Promise<Reward[]> {
  const startTime = performance.now();
  console.log('[RewardsQuery] Fetching rewards from the server');
  
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching rewards:', error);
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
    retry: 1,
    // Only use initialData once it has been loaded from IndexedDB
    initialData: initialData,
    enabled: !isLoadingInitial, // Don't run query until initial loading is done
  });
  
  return {
    ...query,
    // Return cached data while waiting for IndexedDB to load
    data: query.data || initialData || [],
    // Only show loading state if there's no data at all
    isLoading: (query.isLoading || isLoadingInitial) && !initialData?.length
  };
}
