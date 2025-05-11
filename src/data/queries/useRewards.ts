
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
  
  // Save to IndexedDB for offline access
  await saveRewardsToDB(data || []);
  
  return data || [];
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
  
  await savePointsToDB(data?.points || 0);
  
  return data?.points || 0;
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
  
  await saveDomPointsToDB(data?.dom_points || 0);
  
  return data?.dom_points || 0;
};

// Functions to load cached data for placeholderData
const loadCachedRewards = async (): Promise<Reward[]> => {
  try {
    return await loadRewardsFromDB() || [];
  } catch (error) {
    console.error("Error loading cached rewards:", error);
    return [];
  }
};

const loadCachedPoints = async (): Promise<number> => {
  try {
    const cachedPoints = await loadPointsFromDB();
    return cachedPoints !== null ? cachedPoints : 0;
  } catch (error) {
    console.error("Error loading cached points:", error);
    return 0;
  }
};

const loadCachedDomPoints = async (): Promise<number> => {
  try {
    const cachedDomPoints = await loadDomPointsFromDB();
    return cachedDomPoints !== null ? cachedDomPoints : 0;
  } catch (error) {
    console.error("Error loading cached dom points:", error);
    return 0;
  }
};

// Hook for accessing rewards
export function useRewards() {
  const rewardsQuery = useQuery({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
    initialData: [], // Direct array instead of function
    staleTime: Infinity,
    placeholderData: loadCachedRewards
  });

  const pointsQuery = useQuery({
    queryKey: ['points'],
    queryFn: fetchUserPoints,
    initialData: 0, // Direct value instead of function
    staleTime: Infinity,
    placeholderData: loadCachedPoints
  });

  const domPointsQuery = useQuery({
    queryKey: ['dom_points'],
    queryFn: fetchDomPoints,
    initialData: 0, // Direct value instead of function
    staleTime: Infinity,
    placeholderData: loadCachedDomPoints
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
