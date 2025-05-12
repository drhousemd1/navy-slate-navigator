
import { useQueryClient } from "@tanstack/react-query";

export const usePointsManagement = () => {
  const queryClient = useQueryClient();
  
  // Get values from query cache
  const cachedData = queryClient.getQueryData<any>(["profile_points"]) || { points: 0, dom_points: 0 };
  
  // For compatibility with existing code
  return {
    totalPoints: cachedData.points || 0,
    domPoints: cachedData.dom_points || 0,
    setTotalPoints: () => {}, // No-op, since we now update via updateProfilePoints
    setDomPoints: () => {}, // No-op, since we now update via updateProfilePoints
    updatePointsInDatabase: async () => true, // No-op returning success
    updateDomPointsInDatabase: async () => true, // No-op returning success
    refreshPointsFromDatabase: async () => {} // No-op
  };
};

// Simple hook for just getting the points
export function usePoints() {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<any>(["profile_points"]) ?? { points: 0, dom_points: 0 };
}
