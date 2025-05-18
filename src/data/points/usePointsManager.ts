
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';

export const PROFILE_POINTS_QUERY_KEY = ["profile_points"];

interface ProfilePointsData {
  points: number;
  dom_points: number;
}

// Function to fetch points from Supabase
const fetchProfilePoints = async (): Promise<ProfilePointsData> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    // console.error("User not authenticated or error fetching user:", userError);
    // Return default or throw error if user is required for this data.
    // For now, returning default allows UI to render without points if not logged in.
    return { points: 0, dom_points: 0 };
  }
  const userId = userData.user.id;

  const { data, error } = await supabase
    .from("profiles")
    .select("points, dom_points")
    .eq("id", userId)
    .single();

  if (error) {
    // If the profile doesn't exist, it might mean it's a new user.
    // Supabase might return an error if .single() finds no rows.
    // Consider creating a profile row if it's missing or returning defaults.
    // console.error("Error fetching profile points:", error);
    if (error.code === 'PGRST116') { // PGRST116: "The result contains 0 rows"
        // This user might not have a profile entry yet.
        // console.warn(`No profile found for user ${userId}. Returning default points.`);
        return { points: 0, dom_points: 0 };
    }
    throw error; // Re-throw other errors
  }

  return data ? { points: data.points || 0, dom_points: data.dom_points || 0 } : { points: 0, dom_points: 0 };
};

export const usePointsManager = () => {
  const queryClient = useQueryClient();
  const { data: authUserData } = supabase.auth.getUser();
  const userId = authUserData?.user?.id;

  const { 
    data: pointsData, 
    isLoading, 
    error,
    refetch: refreshPointsFromServer,
  } = useQuery<ProfilePointsData, Error>({
    queryKey: PROFILE_POINTS_QUERY_KEY,
    queryFn: fetchProfilePoints,
    enabled: !!userId, // Only run query if user is available
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
      if (!userId) throw new Error("User not authenticated");
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select('points, dom_points') // Select the updated values
        .single(); // Assuming update returns the updated row

      if (updateError) throw updateError;
      if (!data) throw new Error("Failed to update points: No data returned.");
      return { points: data.points, dom_points: data.dom_points };
    },
    onMutate: async (newValues) => {
      await queryClient.cancelQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });
      const previousPointsData = queryClient.getQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY);
      
      queryClient.setQueryData<ProfilePointsData>(PROFILE_POINTS_QUERY_KEY, (old) => ({
        points: newValues.points ?? old?.points ?? 0,
        dom_points: newValues.dom_points ?? old?.dom_points ?? 0,
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
      // `data` here is what mutationFn returned, which are the confirmed new points from DB
      // Update the cache with the confirmed data from the server
      queryClient.setQueryData(PROFILE_POINTS_QUERY_KEY, data);
      toast({ title: "Points updated successfully", variant: "default" });
    },
    onSettled: () => {
      // Optionally, refetch to ensure absolute consistency, though optimistic update + onSuccess setQueryData should be fine.
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
    isLoading: isLoading || updatePointsMutation.isPending,
    error, // This is query error. Mutation error is handled by toast.
    setTotalPoints,
    setDomPoints,
    addPoints,
    addDomPoints,
    refreshPoints,
    isUpdatingPoints: updatePointsMutation.isPending,
  };
};
