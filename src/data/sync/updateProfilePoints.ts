
import { queryClient } from "../queryClient";
import localforage from "localforage";

export async function updateProfilePoints(points: number, dom_points: number) {
  // Update primary profile points cache key used by usePointsManager
  queryClient.setQueryData(["profile_points"], { points, dom_points });
  
  // Update legacy keys used by RewardsContext for backward compatibility
  queryClient.setQueryData(["rewards", "points"], points);
  queryClient.setQueryData(["rewards", "dom_points"], dom_points);
  
  // Update profile key that might be used by other components
  queryClient.setQueryData(["profile"], (oldProfile: any) => {
    if (!oldProfile) return { points, dom_points };
    return { ...oldProfile, points, dom_points };
  });
  
  // Store in localForage for persistence across page reloads
  await localforage.setItem("profile_points", { points, dom_points });
  await localforage.setItem("rewards_points", points);
  await localforage.setItem("rewards_dom_points", dom_points);
}
