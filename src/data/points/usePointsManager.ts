
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';
import { updateProfilePoints } from "@/data/sync/updateProfilePoints";
import { REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY } from "@/data/rewards/queries";

export const PROFILE_POINTS_QUERY_KEY = ["profile_points"];

interface ProfilePointsData {
  points: number;
  dom_points: number;
}

// Function to fetch points from Supabase
const fetchProfilePoints = async (): Promise<ProfilePointsData> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    console.warn("User not authenticated or error fetching user. Returning default points.");
    return { points: 0, dom_points: 0 };
  }
  const userId = userData.user.id;

  const { data, error } = await supabase
    .from("profiles")
    .select("points, dom_points")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching profile points:", error);
    if (error.code === 'PGRST116') { // PGRST116: "The result contains 0 rows"
        console.warn(`No profile found for user ${userId}. Returning default points.`);
        return { points: 0, dom_points: 0 };
    }
    return { points: 0, dom_points: 0 }; 
  }

  return data ? { points: data.points || 0, dom_points: data.dom_points || 0 } : { points: 0, dom_points: 0 };
};

export const usePointsManager = () => {
  const queryClient = useQueryClient();

  const { 
    data: pointsData, 
    isLoading, 
    error,
    refetch: refreshPointsFromServer,
  } = useQuery<ProfilePointsData, Error>({
    queryKey: PROFILE_POINTS_QUERY_KEY,
    queryFn: fetchProfilePoints,
  });

  const currentPoints = pointsData?.points ?? 0;
  const currentDomPoints = pointsData?.dom_points ?? 0;

  // Mutation to update points (generic for both types)
  const updatePointsMutation = useMutation<
    Partial<ProfilePointsData>,
    Error,
    { points?: number; dom_points?: number },
    { previousPointsData?: ProfilePointsData }
  >({
    mutationFn: async (updates) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error("User not authenticated. Cannot update points.");
      }
      const userId = authData.user.id;

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select('points, dom_points')
        .single();

      if (updateError) {
        throw updateError;
      }
      if (!data) {
        throw new Error("Failed to update points: No data returned.");
      }
      return { points: data.points, dom_points: data.dom_points };
    },
    onMutate: async (newValues) => {
      await queryClient.cancelQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: REWARDS_DOM_POINTS_QUERY_KEY });
      
      const previousPointsData = queryClient.getQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY);
      
      const updatedPoints = {
        points: newValues.points !== undefined ? newValues.points : (previousPointsData?.points ?? 0),
        dom_points: newValues.dom_points !== undefined ? newValues.dom_points : (previousPointsData?.dom_points ?? 0),
      };
      
      // Update all relevant query keys
      await updateProfilePoints(updatedPoints.points, updatedPoints.dom_points);
      
      return { previousPointsData };
    },
    onError: (err, _newValues, context) => {
      if (context?.previousPointsData) {
        // Restore previous points to all relevant query keys
        updateProfilePoints(context.previousPointsData.points, context.previousPointsData.dom_points);
      }
      toast({ title: "Error updating points", description: err.message, variant: "destructive" });
    },
    onSuccess: (data) => {
      // Ensure all query keys are updated with the latest values
      updateProfilePoints(data.points ?? currentPoints, data.dom_points ?? currentDomPoints);
    },
  });

  const setTotalPoints = async (newPoints: number) => {
    await updatePointsMutation.mutateAsync({ points: newPoints });
  };

  const setDomPoints = async (newDomPoints: number) => {
    await updatePointsMutation.mutateAsync({ dom_points: newDomPoints });
  };

  const addPoints = async (amount: number) => {
    const newTotalPoints = currentPoints + amount;
    await setTotalPoints(newTotalPoints);
  };

  const addDomPoints = async (amount: number) => {
    const newTotalDomPoints = currentDomPoints + amount;
    await setDomPoints(newTotalDomPoints);
  };

  const refreshPoints = async () => {
    try {
      const freshPoints = await refreshPointsFromServer();
      if (freshPoints.data) {
        // Make sure we update all other query keys for consistency
        await updateProfilePoints(freshPoints.data.points, freshPoints.data.dom_points);
      }
    } catch (error) {
      console.error("Error refreshing points:", error);
    }
  };

  return {
    points: currentPoints,
    domPoints: currentDomPoints,
    isLoadingPoints: isLoading,
    pointsError: error,
    setTotalPoints,
    setDomPoints,
    addPoints,
    addDomPoints,
    refreshPoints,
    isUpdatingPoints: updatePointsMutation.isPending,
  };
};
