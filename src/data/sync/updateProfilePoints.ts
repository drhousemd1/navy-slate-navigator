
import { queryClient } from "../queryClient";
import localforage from "localforage";
import { getProfilePointsQueryKey, PROFILE_POINTS_QUERY_KEY_BASE } from "@/data/points/usePointsManager";
import { supabase } from "@/integrations/supabase/client";

// This function now requires a userId to ensure cache and local storage are updated for the correct user.
export async function updateProfilePoints(userId: string, points: number, dom_points: number) {
  if (!userId) {
    console.error("updateProfilePoints: userId is required.");
    return;
  }

  // Update database first
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        points, 
        dom_points, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId);
      
    if (error) {
      console.error("Failed to update profile points in database:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error updating profile in database:", error);
    // Continue with cache updates even if database update fails
    // The next refetch will sync with database
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
  
  // Invalidate queries to force components to refetch if needed
  queryClient.invalidateQueries({ queryKey: userProfilePointsKey });
  queryClient.invalidateQueries({ queryKey: ["rewards", "points", userId] });
  queryClient.invalidateQueries({ queryKey: ["rewards", "dom_points", userId] });
  queryClient.invalidateQueries({ queryKey: ["profile", userId] });
}
