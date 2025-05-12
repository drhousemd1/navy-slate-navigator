
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePointsManagement = () => {
  const queryClient = useQueryClient();
  
  // Get values from query cache
  const cachedData = queryClient.getQueryData<any>(["profile_points"]) || { points: 0, dom_points: 0 };
  
  const refreshPointsFromDatabase = async () => {
    // Implementation to refresh points from database
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("points, dom_points")
        .eq("id", userData.user.id)
        .single();
        
      if (data) {
        queryClient.setQueryData(["profile_points"], data);
      }
    } catch (error) {
      console.error("Error refreshing points from database:", error);
    }
  };

  const updatePointsInDatabase = async (points: number) => {
    // Implementation to update points
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return false;
      
      const { error } = await supabase
        .from("profiles")
        .update({ points })
        .eq("id", userData.user.id);
        
      if (error) {
        throw error;
      }
      
      // Update the cache - Fix: Handle old value properly
      queryClient.setQueryData(
        ["profile_points"], 
        (old: any) => {
          if (old && typeof old === 'object') {
            return { ...old, points };
          }
          return { points, dom_points: 0 };
        }
      );
      
      return true;
    } catch (error) {
      console.error("Error updating points:", error);
      return false;
    }
  };

  const updateDomPointsInDatabase = async (points: number) => {
    // Implementation to update dom points
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return false;
      
      const { error } = await supabase
        .from("profiles")
        .update({ dom_points: points })
        .eq("id", userData.user.id);
        
      if (error) {
        throw error;
      }
      
      // Update the cache - Fix: Handle old value properly
      queryClient.setQueryData(
        ["profile_points"], 
        (old: any) => {
          if (old && typeof old === 'object') {
            return { ...old, dom_points: points };
          }
          return { points: 0, dom_points: points };
        }
      );
      
      return true;
    } catch (error) {
      console.error("Error updating dom points:", error);
      return false;
    }
  };
  
  return {
    totalPoints: cachedData.points || 0,
    domPoints: cachedData.dom_points || 0,
    setTotalPoints: updatePointsInDatabase,
    setDomPoints: updateDomPointsInDatabase,
    updatePointsInDatabase,
    updateDomPointsInDatabase,
    refreshPointsFromDatabase
  };
};

// Simple hook for just getting the points
export function usePoints() {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<any>(["profile_points"]) ?? { points: 0, dom_points: 0 };
}
