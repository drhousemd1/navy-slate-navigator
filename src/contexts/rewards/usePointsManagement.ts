
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY } from '@/data/rewards/queries';
import { updateProfilePoints } from '@/data/sync/updateProfilePoints';

export const usePointsManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Instead of managing local state with useState, use React Query cache
  const profilePoints = queryClient.getQueryData<{points: number, dom_points: number}>(["profile_points"]) || { points: 0, dom_points: 0 };
  const totalPoints = profilePoints.points;
  const domPoints = profilePoints.dom_points;
  
  // Set up methods to update the cache
  const setTotalPoints = useCallback(async (newPoints: number) => {
    await updateProfilePoints(newPoints, domPoints);
  }, [domPoints]);
  
  const setDomPoints = useCallback(async (newDomPoints: number) => {
    await updateProfilePoints(totalPoints, newDomPoints);
  }, [totalPoints]);
  
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
