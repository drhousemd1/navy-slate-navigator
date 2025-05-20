
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';
import { useEffect, useState } from "react";

// Define a base key for profile points
export const PROFILE_POINTS_QUERY_KEY_BASE = "profile_points";

// Function to generate the query key for a specific user or the current user
export const getProfilePointsQueryKey = (userId?: string | null) => {
  // If no userId is provided, it implies the current authenticated user.
  // We use a specific string "current_authenticated_user" in the key
  // to differentiate from a guest or unauthenticated state.
  // The fetchProfilePoints function will resolve this to the actual user ID.
  return [PROFILE_POINTS_QUERY_KEY_BASE, userId || "current_authenticated_user"];
};

export interface ProfilePointsData {
  points: number;
  dom_points: number;
}

// Function to fetch points from Supabase, now accepts an optional userIdToFetch
const fetchProfilePoints = async (userIdToFetch?: string | null): Promise<ProfilePointsData> => {
  let userId = userIdToFetch;

  if (!userId || userId === "current_authenticated_user") {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return { points: 0, dom_points: 0 };
    }
    userId = userData.user.id;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("points, dom_points")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { points: 0, dom_points: 0 };
    }
    return { points: 0, dom_points: 0 };
  }

  return data ? { points: data.points || 0, dom_points: data.dom_points || 0 } : { points: 0, dom_points: 0 };
};

// targetUserId: specific user to fetch for. If undefined/null, fetches for current authenticated user.
export const usePointsManager = (targetUserId?: string | null) => {
  const queryClient = useQueryClient();
  const queryKey = getProfilePointsQueryKey(targetUserId);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  
  // Get the current user and their linked partner
  useEffect(() => {
    const getCurrentUserAndPartner = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // If we're getting points for a specific user who isn't the current user
        if (targetUserId && targetUserId !== user.id) return;
        
        // Get current user's profile to find partner
        const { data: profile } = await supabase
          .from('profiles')
          .select('linked_partner_id')
          .eq('id', user.id)
          .single();
          
        if (profile?.linked_partner_id) {
          setPartnerId(profile.linked_partner_id);
        }
      } catch (error) {
        console.error("Error fetching user and partner info:", error);
      }
    };
    
    getCurrentUserAndPartner();
  }, [targetUserId]);
  
  // Query for the specified user's points (or current user if not specified)
  const {
    data: pointsData,
    isLoading,
    error,
    refetch: refreshPointsFromServer,
  } = useQuery<ProfilePointsData, Error>({
    queryKey: queryKey,
    queryFn: () => fetchProfilePoints(targetUserId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Query for partner's points if partner ID is available
  const {
    data: partnerPointsData,
    isLoading: isLoadingPartner,
    refetch: refreshPartnerPointsFromServer,
  } = useQuery<ProfilePointsData, Error>({
    queryKey: partnerId ? getProfilePointsQueryKey(partnerId) : ['no-partner'],
    queryFn: () => partnerId ? fetchProfilePoints(partnerId) : Promise.resolve({ points: 0, dom_points: 0 }),
    enabled: !!partnerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const currentPoints = pointsData?.points ?? 0;
  const currentDomPoints = pointsData?.dom_points ?? 0;
  const partnerPoints = partnerPointsData?.points ?? 0;
  const partnerDomPoints = partnerPointsData?.dom_points ?? 0;

  // Mutation to update points (generic for both types)
  // This mutation, as part of usePointsManager, will update points for the user
  // whose ID was used to instantiate this instance of usePointsManager (via targetUserId or current auth user).
  const updatePointsMutation = useMutation<
    Partial<ProfilePointsData>,
    Error,
    { points?: number; dom_points?: number },
    { previousPointsData?: ProfilePointsData }
  >({
    mutationFn: async (updates) => {
      let userIdToUpdate = targetUserId;
      if (!userIdToUpdate || userIdToUpdate === "current_authenticated_user") {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
          throw new Error("User not authenticated. Cannot update points.");
        }
        userIdToUpdate = authData.user.id;
      }
      
      if (!userIdToUpdate) throw new Error("Could not determine user ID for points update.");

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userIdToUpdate)
        .select('points, dom_points')
        .single();

      if (updateError) throw updateError;
      if (!data) throw new Error("Failed to update points: No data returned.");
      return { points: data.points, dom_points: data.dom_points };
    },
    onMutate: async (newValues) => {
      // queryKey here is already user-specific due to getProfilePointsQueryKey(targetUserId)
      await queryClient.cancelQueries({ queryKey });
      const previousPointsData = queryClient.getQueryData<ProfilePointsData>(queryKey);

      queryClient.setQueryData<ProfilePointsData>(queryKey, (old) => ({
        points: newValues.points !== undefined ? newValues.points : (old?.points ?? 0),
        dom_points: newValues.dom_points !== undefined ? newValues.dom_points : (old?.dom_points ?? 0),
      }));

      return { previousPointsData };
    },
    onError: (err, _newValues, context) => {
      if (context?.previousPointsData) {
        queryClient.setQueryData(queryKey, context.previousPointsData);
      }
      toast({ title: "Error updating points", description: err.message, variant: "destructive" });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
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
    if (partnerId) {
      await refreshPartnerPointsFromServer();
    }
  };

  return {
    points: currentPoints,
    domPoints: currentDomPoints,
    partnerPoints,
    partnerDomPoints,
    partnerId,
    isLoadingPoints: isLoading,
    isLoadingPartner,
    pointsError: error,
    setTotalPoints,
    setDomPoints,
    addPoints,
    addDomPoints,
    refreshPoints,
    isUpdatingPoints: updatePointsMutation.isPending,
  };
};
