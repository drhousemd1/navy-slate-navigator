
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY } from '@/data/rewards/queries';

export const usePointsManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Instead of managing local state with useState, use React Query cache
  const totalPoints = queryClient.getQueryData<number>(REWARDS_POINTS_QUERY_KEY) ?? 0;
  const domPoints = queryClient.getQueryData<number>(REWARDS_DOM_POINTS_QUERY_KEY) ?? 0;
  
  // Set up methods to update the cache
  const setTotalPoints = useCallback(async (newPoints: number) => {
    queryClient.setQueryData(REWARDS_POINTS_QUERY_KEY, newPoints);
  }, [queryClient]);
  
  const setDomPoints = useCallback(async (newDomPoints: number) => {
    queryClient.setQueryData(REWARDS_DOM_POINTS_QUERY_KEY, newDomPoints);
  }, [queryClient]);
  
  // This will be called from parent components when needed
  const refreshPointsFromDatabase = useCallback(async () => {
    // This now happens in the main query, not here
    console.log("Points refreshed from the main query");
  }, []);

  return {
    totalPoints,
    domPoints,
    setTotalPoints,
    setDomPoints,
    updatePointsInDatabase: setTotalPoints,
    updateDomPointsInDatabase: setDomPoints,
    refreshPointsFromDatabase
  };
};
