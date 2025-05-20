
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import { queryClient } from "../queryClient";
import localforage from "localforage";
import { getProfilePointsQueryKey, PROFILE_POINTS_QUERY_KEY_BASE } from "@/data/points/usePointsManager";

// This function now requires a userId to ensure cache and local storage are updated for the correct user.
export async function updateProfilePoints(userId: string, points: number, dom_points: number) {
  if (!userId) {
    console.error("updateProfilePoints: userId is required.");
    return;
  }

  const userProfilePointsKey = getProfilePointsQueryKey(userId); // e.g., ["profile_points", "user-id-123"]
  
  // Update primary profile points cache key used by usePointsManager
  queryClient.setQueryData(userProfilePointsKey, { points, dom_points });
  
  // Update legacy keys, now also scoped by userId for consistency
  // ["rewards", "points", "user-id-123"]
  // ["rewards", "dom_points", "user-id-123"]
  queryClient.setQueryData(["rewards", "points", userId], points);
  queryClient.setQueryData(["rewards", "dom_points", userId], dom_points);
  
  // Update general profile key, also scoped by userId
  // This assumes ["profile", userId] is or will be the pattern for fetching a specific user's full profile.
  queryClient.setQueryData(["profile", userId], (oldProfile: any) => {
    if (!oldProfile) return { id: userId, points, dom_points }; // Include id if creating new
    return { ...oldProfile, points, dom_points };
  });
  
  // Store in localForage, scoped by userId
  await localforage.setItem(`profile_points_${userId}`, { points, dom_points });
  await localforage.setItem(`rewards_points_${userId}`, points);
  await localforage.setItem(`rewards_dom_points_${userId}`, dom_points);
}
