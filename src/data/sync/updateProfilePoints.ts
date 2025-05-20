
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import { queryClient } from "../queryClient";
import localforage from "localforage";
import { getProfilePointsQueryKey, PROFILE_POINTS_QUERY_KEY_BASE } from "@/data/points/usePointsManager";
import { supabase } from "@/integrations/supabase/client"; // Import supabase

// This function now requires a userId to ensure cache and local storage are updated for the correct user.
export async function updateProfilePoints(userId: string, points: number, dom_points: number) {
  if (!userId) {
    console.error("updateProfilePoints: userId is required.");
    return;
  }

  console.log(`updateProfilePoints: Updating cache for user ${userId} with points=${points}, dom_points=${dom_points}`);

  const userProfilePointsKey = getProfilePointsQueryKey(userId); // e.g., ["profile_points", "user-id-123"]
  
  // Update primary profile points cache key used by usePointsManager
  queryClient.setQueryData(userProfilePointsKey, { points, dom_points });
  
  // Update legacy keys, now also scoped by userId for consistency
  queryClient.setQueryData(["rewards", "points", userId], points);
  queryClient.setQueryData(["rewards", "dom_points", userId], dom_points);
  
  // Update general profile key, also scoped by userId
  queryClient.setQueryData(["profile", userId], (oldProfile: any) => {
    if (!oldProfile) return { id: userId, points, dom_points }; // Include id if creating new
    return { ...oldProfile, points, dom_points };
  });
  
  // Also update general base key if this is the current authenticated user
  try {
    // Use supabase.auth.getUser() to reliably get the current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser && currentUser.id === userId) {
      console.log("Updating base key for current authenticated user", userId);
      queryClient.setQueryData([PROFILE_POINTS_QUERY_KEY_BASE], { points, dom_points });
    }
  } catch (error) {
    console.error("Error checking if userId is current user in updateProfilePoints:", error);
  }
  
  // Store in localForage, scoped by userId
  try {
    await localforage.setItem(`profile_points_${userId}`, { points, dom_points });
    await localforage.setItem(`rewards_points_${userId}`, points);
    await localforage.setItem(`rewards_dom_points_${userId}`, dom_points);
  } catch (error) {
    console.error("Error saving points to localForage:", error);
  }
}
