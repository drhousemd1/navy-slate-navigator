
import { queryClient } from "../queryClient";
import localforage from "localforage";
import { PROFILE_POINTS_QUERY_KEY } from '@/data/points/usePointsManager';
import { REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY } from '@/data/rewards/queries';

/**
 * Updates all relevant cache keys for profile points to ensure consistent UI display
 * across all components that use points data
 * 
 * @param points Submissive points (regular points)
 * @param dom_points Dominant points
 */
export async function updateProfilePoints(points: number, dom_points: number) {
  console.log("updateProfilePoints called with:", { points, dom_points });
  
  // Update the profile_points for usePointsManager
  queryClient.setQueryData(PROFILE_POINTS_QUERY_KEY, { points, dom_points });
  
  // Update the points for the older RewardsContext system
  queryClient.setQueryData(REWARDS_POINTS_QUERY_KEY, points);
  queryClient.setQueryData(REWARDS_DOM_POINTS_QUERY_KEY, dom_points);
  
  // Update local storage for offline/persistent access
  await localforage.setItem("profile_points", { points, dom_points });
}
