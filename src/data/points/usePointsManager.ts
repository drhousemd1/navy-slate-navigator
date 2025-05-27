import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export const PROFILE_POINTS_QUERY_KEY = ["profile_points"];

interface ProfilePointsData {
  points: number;
  dom_points: number;
}

// Function to fetch points from Supabase
const fetchProfilePoints = async (): Promise<ProfilePointsData> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    // logger.warn("User not authenticated or error fetching user. Returning default points.");
    return { points: 0, dom_points: 0 };
  }
  const userId = userData.user.id;

  const { data, error } = await supabase
    .from("profiles")
    .select("points, dom_points")
    .eq("id", userId)
    .single();

  if (error) {
    // logger.error("Error fetching profile points:", error);
    if (error.code === 'PGRST116') { // PGRST116: "The result contains 0 rows"
        // logger.warn(`No profile found for user ${userId}. Returning default points.`);
        return { points: 0, dom_points: 0 };
    }
    // For other errors, we might want to throw or handle differently.
    // For now, returning default points on error to prevent UI breakage.
    // Consider logging this error to a monitoring service in a real app.
    return { points: 0, dom_points: 0 }; 
  }

  return data ? { points: data.points || 0, dom_points: data.dom_points || 0 } : { points: 0, dom_points: 0 };
};

export const usePointsManager = () => {
  const queryClient = useQueryClient();

  const { 
    data: pointsData, 
    isLoading, 
    error, // This is the query error
    refetch: refreshPointsFromServer,
  } = useQuery<ProfilePointsData, Error>({
    queryKey: PROFILE_POINTS_QUERY_KEY,
    queryFn: fetchProfilePoints,
    // `enabled` flag removed; fetchProfilePoints handles the "no user" case by returning defaults.
    // staleTime, gcTime, etc., will be inherited from defaultQueryOptions in QueryClient
  });

  const currentPoints = pointsData?.points ?? 0;
  const currentDomPoints = pointsData?.dom_points ?? 0;

  // Mutation to update points (generic for both types)
  const updatePointsMutation = useMutation<
    Partial<ProfilePointsData>, // Success data type from mutationFn
    Error, // Error type
    { points?: number; dom_points?: number }, // Variables type
    { previousPointsData?: ProfilePointsData } // Context type for optimistic updates
  >({
    mutationFn: async (updates) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        // logger.error("Mutation: User not authenticated or error fetching user:", authError);
        throw new Error("User not authenticated. Cannot update points.");
      }
      const userId = authData.user.id;

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select('points, dom_points') // Select the updated values
        .single(); // Assuming update returns the updated row

      if (updateError) {
        // logger.error("Error updating points in Supabase:", updateError);
        throw updateError;
      }
      if (!data) {
        // logger.error("Failed to update points: No data returned from Supabase.");
        throw new Error("Failed to update points: No data returned.");
      }
      return { points: data.points, dom_points: data.dom_points };
    },
    onMutate: async (newValues) => {
      await queryClient.cancelQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });
      const previousPointsData = queryClient.getQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY);
      
      queryClient.setQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY, (old) => ({
        points: newValues.points !== undefined ? newValues.points : (old?.points ?? 0),
        dom_points: newValues.dom_points !== undefined ? newValues.dom_points : (old?.dom_points ?? 0),
      }));
      
      return { previousPointsData };
    },
    onError: (err, _newValues, context) => {
      if (context?.previousPointsData) {
        queryClient.setQueryData(PROFILE_POINTS_QUERY_KEY, context.previousPointsData);
      }
      toast({ title: "Error updating points", description: err.message, variant: "destructive" });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_POINTS_QUERY_KEY, data);
      // toast({ title: "Points updated successfully", variant: "default" }); // Toast on success can be optional or more specific
    },
    onSettled: () => {
      // Optionally, invalidate to ensure consistency if optimistic updates are complex,
      // but usually setQueryData in onSuccess is sufficient.
      // queryClient.invalidateQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });
    },
  });

  const setTotalPoints = async (newPoints: number) => {
    await updatePointsMutation.mutateAsync({ points: newPoints });
  };

  const setDomPoints = async (newDomPoints: number) => {
    await updatePointsMutation.mutateAsync({ dom_points: newDomPoints });
  };

  const addPoints = async (amount: number) => {
    // Optimistic update might be preferred here as well, before calling mutateAsync
    // For simplicity, currentPoints is used, which relies on queryData.
    // A more robust optimistic add would calculate based on the current state in onMutate.
    const newTotalPoints = currentPoints + amount;
    await setTotalPoints(newTotalPoints);
  };

  const addDomPoints = async (amount: number) => {
    const newTotalDomPoints = currentDomPoints + amount;
    await setDomPoints(newTotalDomPoints);
  };

  const refreshPoints = async () => {
    await refreshPointsFromServer();
  };

  return {
    points: currentPoints,
    domPoints: currentDomPoints,
    isLoadingPoints: isLoading, // Renamed for clarity from general 'isLoading'
    pointsError: error, // Renamed for clarity
    setTotalPoints,
    setDomPoints,
    addPoints,
    addDomPoints,
    refreshPoints,
    isUpdatingPoints: updatePointsMutation.isPending,
  };
};
