
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { Reward } from "@/lib/rewardUtils";
import { loadRewardsFromDB, saveRewardsToDB, loadPointsFromDB, saveDomPointsToDB, loadDomPointsFromDB, savePointsToDB } from "../indexedDB/useIndexedDB";

// Fetch rewards from Supabase
const fetchRewards = async (): Promise<Reward[]> => {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    throw error;
  }
  
  // Transform data to ensure it matches the Reward interface
  const transformedRewards: Reward[] = (data || []).map(reward => ({
    id: reward.id,
    title: reward.title,
    description: reward.description || "",
    cost: reward.cost,
    supply: reward.supply,
    is_dom_reward: reward.is_dom_reward === true, // Ensure boolean type
    background_image_url: reward.background_image_url,
    background_opacity: reward.background_opacity || 100,
    focal_point_x: reward.focal_point_x || 50,
    focal_point_y: reward.focal_point_y || 50,
    highlight_effect: reward.highlight_effect || false,
    icon_name: reward.icon_name,
    icon_color: reward.icon_color || "#9b87f5",
    title_color: reward.title_color || "#FFFFFF",
    subtext_color: reward.subtext_color || "#8E9196",
    calendar_color: reward.calendar_color || "#7E69AB",
    created_at: reward.created_at || new Date().toISOString(),
    updated_at: reward.updated_at || new Date().toISOString(),
  }));
  
  // Save to IndexedDB for offline access
  await saveRewardsToDB(transformedRewards);
  
  return transformedRewards;
};

// Fetch user points
const fetchUserPoints = async (): Promise<number> => {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  
  if (!userId) {
    return 0;
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single();
  
  if (error) {
    throw error;
  }
  
  const points = data?.points ?? 0;
  await savePointsToDB(points);
  
  return points;
};

// Fetch dom points
const fetchDomPoints = async (): Promise<number> => {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  
  if (!userId) {
    return 0;
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('dom_points')
    .eq('id', userId)
    .single();
  
  if (error) {
    throw error;
  }
  
  const domPoints = data?.dom_points ?? 0;
  await saveDomPointsToDB(domPoints);
  
  return domPoints;
};

// Hook for accessing rewards
export function useRewards() {
  const rewardsQuery = useQuery({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
    initialData: [], 
    staleTime: Infinity,
    placeholderData: () => {
      // Return empty array as placeholder
      return [];
    },
    gcTime: 5 * 60 * 1000 // 5 minutes
  });

  const pointsQuery = useQuery({
    queryKey: ['points'],
    queryFn: fetchUserPoints,
    initialData: 0,
    staleTime: Infinity,
    placeholderData: () => {
      // Return 0 as placeholder
      return 0;
    },
    gcTime: 5 * 60 * 1000 // 5 minutes
  });

  const domPointsQuery = useQuery({
    queryKey: ['dom_points'],
    queryFn: fetchDomPoints,
    initialData: 0,
    staleTime: Infinity,
    placeholderData: () => {
      // Return 0 as placeholder
      return 0;
    },
    gcTime: 5 * 60 * 1000 // 5 minutes
  });

  return {
    rewards: rewardsQuery.data || [],
    isLoading: rewardsQuery.isLoading,
    error: rewardsQuery.error,
    totalPoints: pointsQuery.data || 0,
    domPoints: domPointsQuery.data || 0,
    refetchRewards: rewardsQuery.refetch,
  };
}
