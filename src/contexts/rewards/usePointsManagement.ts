
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { updateProfilePoints } from '@/data/sync/updateProfilePoints';

export const usePointsManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Get points from React Query cache using both the generic key and the rewards-specific keys
  const profilePoints = queryClient.getQueryData<{points: number, dom_points: number}>(["profile_points"]) || { points: 0, dom_points: 0 };
  const totalPoints = queryClient.getQueryData<number>(["rewards", "points"]) ?? profilePoints.points;
  const domPoints = queryClient.getQueryData<number>(["rewards", "dom_points"]) ?? profilePoints.dom_points;
  
  // Set up methods to update the cache
  const setTotalPoints = useCallback(async (newPoints: number) => {
    await updateProfilePoints(newPoints, domPoints);
  }, [domPoints]);
  
  const setDomPoints = useCallback(async (newDomPoints: number) => {
    await updateProfilePoints(totalPoints, newDomPoints);
  }, [totalPoints]);
  
  // This will be called from parent components when needed
  const refreshPointsFromDatabase = useCallback(async () => {
    // Forces React Query to refetch the points data
    await queryClient.invalidateQueries({ queryKey: ['rewards', 'points'] });
    await queryClient.invalidateQueries({ queryKey: ['rewards', 'dom_points'] });
    await queryClient.invalidateQueries({ queryKey: ["profile_points"] });
  }, [queryClient]);

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
