
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData, PunishmentHistoryItem, ApplyPunishmentArgs } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import {
  loadPunishmentsFromDB,
  savePunishmentsToDB,
  loadPunishmentHistoryFromDB,
  savePunishmentHistoryToDB,
} from '../indexedDB/useIndexedDB';
import { useRewards } from '@/contexts/RewardsContext'; // For points updates
import { getDayOfWeek, getMondayBasedIndex } from '@/lib/dateUtils'; // Assuming date utils

const PUNISHMENTS_QUERY_KEY = ['punishments'];
const PUNISHMENT_HISTORY_QUERY_KEY = ['punishmentHistory'];

export const usePunishmentsData = () => {
  const queryClient = useQueryClient();
  const { refreshPointsFromDatabase } = useRewards();

  // State for random punishment selection
  const [isSelectingRandom, setIsSelectingRandom] = useState(false);
  const [selectedPunishment, setSelectedPunishment] = useState<PunishmentData | null>(null);

  // --- Queries ---
  const {
    data: punishments = [],
    isLoading: isLoadingPunishments,
    error: errorPunishments,
    refetch: refetchPunishments,
  } = useQuery<PunishmentData[], Error>({
    queryKey: PUNISHMENTS_QUERY_KEY,
    queryFn: async () => {
      const localData = await loadPunishmentsFromDB() as PunishmentData[] | null;
      // Basic "fetch if empty" logic, can be expanded with time-based staleness
      if (localData && localData.length > 0) {
        return localData;
      }
      const { data, error } = await supabase.from('punishments').select('*');
      if (error) throw error;
      await savePunishmentsToDB(data || []);
      return data || [];
    },
    staleTime: Infinity, // Keep data fresh until manually invalidated
  });

  const {
    data: punishmentHistory = [],
    isLoading: isLoadingHistory,
    error: errorHistory,
    refetch: refetchHistory,
  } = useQuery<PunishmentHistoryItem[], Error>({
    queryKey: PUNISHMENT_HISTORY_QUERY_KEY,
    queryFn: async () => {
      const localData = await loadPunishmentHistoryFromDB();
      if (localData && localData.length > 0) {
        return localData;
      }
      // NOTE: Supabase call for history might depend on user or be global
      // For now, assuming local-first or a placeholder if no Supabase fetch is defined
      // const { data, error } = await supabase.from('punishment_history').select('*');
      // if (error) throw error;
      // await savePunishmentHistoryToDB(data || []);
      // return data || [];
      return []; // Default to empty if no Supabase fetch for global history
    },
    staleTime: 1000 * 60 * 5, // History might change more often
  });

  // --- Mutations ---
  const savePunishmentMutation = useMutation<void, Error, Partial<PunishmentData>>({
    mutationFn: async (punishmentData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const dataToSave: PunishmentData = {
        // Provide defaults for all required fields if not in punishmentData
        title: '',
        points: 0,
        background_opacity: 50, // Default for required field
        title_color: '#FFFFFF',
        subtext_color: '#8E9196',
        calendar_color: '#ea384c',
        highlight_effect: false,
        icon_color: '#ea384c',
        focal_point_x: 50,
        focal_point_y: 50,
        ...punishmentData, // Spread incoming data
        id: punishmentData.id || uuidv4(), // Ensure ID exists
        updated_at: new Date().toISOString(),
      };
      
      if (!punishmentData.id) { // Create new
        dataToSave.created_at = new Date().toISOString();
      }

      const { error } = await supabase.from('punishments').upsert(dataToSave).select();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      toast({ title: 'Punishment saved successfully!' });
    },
    onError: (error) => {
      toast({ title: 'Error saving punishment', description: error.message, variant: 'destructive' });
    },
  });

  const deletePunishmentMutation = useMutation<void, Error, string>({
    mutationFn: async (punishmentId) => {
      const { error } = await supabase.from('punishments').delete().eq('id', punishmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      toast({ title: 'Punishment deleted successfully!' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting punishment', description: error.message, variant: 'destructive' });
    },
  });
  
  const applyPunishmentMutation = useMutation<void, Error, ApplyPunishmentArgs>({
    mutationFn: async (args: ApplyPunishmentArgs) => {
        const { id: punishmentId, costPoints, domEarn, profileId, subPoints, domPoints } = args;

        // 1. Deduct points from submissive's profile
        const newSubPoints = subPoints - costPoints;
        const { error: subProfileError } = await supabase
            .from('profiles')
            .update({ points: newSubPoints, updated_at: new Date().toISOString() })
            .eq('id', profileId);
        if (subProfileError) throw new Error(`Failed to update submissive profile: ${subProfileError.message}`);

        // 2. Add points to dominant's profile (if applicable, requires partner link logic)
        // This part needs clarification: Who is the dominant? Is there a linked partner?
        // For now, let's assume dom_points are for the current user if they are also the dominant.
        // Or if there's a linked partner, update their dom_points.
        // The current structure implies the `profileId` is the submissive.
        // If the system has a concept of a linked dominant user, fetch their ID.
        // Placeholder: If domEarn is for the current user acting as dominant.
        
        const { data: userProfile } = await supabase.from('profiles').select('linked_partner_id').eq('id', profileId).single();

        if (userProfile?.linked_partner_id) {
            const { data: partnerProfile, error: partnerProfileError } = await supabase
                .from('profiles')
                .select('dom_points')
                .eq('id', userProfile.linked_partner_id)
                .single();

            if (partnerProfileError) throw new Error(`Failed to fetch partner profile: ${partnerProfileError.message}`);
            
            if (partnerProfile) {
                const newDomPoints = (partnerProfile.dom_points || 0) + domEarn;
                const { error: domProfileError } = await supabase
                    .from('profiles')
                    .update({ dom_points: newDomPoints, updated_at: new Date().toISOString() })
                    .eq('id', userProfile.linked_partner_id);
                if (domProfileError) throw new Error(`Failed to update dominant profile: ${domProfileError.message}`);
            }
        }


        // 3. Record in punishment_history
        const historyEntry: Omit<PunishmentHistoryItem, 'id'> = {
            punishment_id: punishmentId,
            applied_date: new Date().toISOString(),
            points_deducted: costPoints,
            day_of_week: getDayOfWeek(new Date()), // Assumes getDayOfWeek utility
        };
        const { error: historyError } = await supabase.from('punishment_history').insert(historyEntry);
        if (historyError) throw new Error(`Failed to record punishment history: ${historyError.message}`);
    },
    onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
        await queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY }); // Invalidate punishments to update usage_data if calculated from history
        await refreshPointsFromDatabase(); // Refresh global points
        toast({ title: 'Punishment applied successfully!' });
    },
    onError: (error) => {
        toast({ title: 'Error applying punishment', description: error.message, variant: 'destructive' });
    },
});


  // --- Helper Functions ---
  const getPunishmentById = useCallback((id: string): PunishmentData | undefined => {
    return punishments.find(p => p.id === id);
  }, [punishments]);

  const getPunishmentHistory = useCallback((punishmentId: string): PunishmentHistoryItem[] => {
    return punishmentHistory.filter(item => item.punishment_id === punishmentId);
  }, [punishmentHistory]);

  const selectRandomPunishment = useCallback((): PunishmentData | null => {
    if (punishments.length === 0) return null;
    setIsSelectingRandom(true);
    const randomIndex = Math.floor(Math.random() * punishments.length);
    const randomPunishment = punishments[randomIndex];
    setSelectedPunishment(randomPunishment);
    // setIsSelectingRandom(false); // Potentially set this after a delay or action
    return randomPunishment;
  }, [punishments]);

  // Calculate recently applied punishments (e.g., last 5)
  const recentlyAppliedPunishments = useMemo(() => {
    return [...punishmentHistory]
      .sort((a, b) => new Date(b.applied_date).getTime() - new Date(a.applied_date).getTime())
      .slice(0, 5);
  }, [punishmentHistory]);
  
  // Aggregate usage data for each punishment
  const punishmentsWithUsage = useMemo(() => {
    return punishments.map(punishment => {
      const historyForPunishment = punishmentHistory.filter(h => h.punishment_id === punishment.id);
      const usage_data = [0, 0, 0, 0, 0, 0, 0]; // Monday to Sunday
      historyForPunishment.forEach(item => {
        const dayIndex = getMondayBasedIndex(new Date(item.applied_date).getDay());
        if (dayIndex >= 0 && dayIndex < 7) {
          usage_data[dayIndex] += 1; // Increment count for the day
        }
      });
      return {
        ...punishment,
        usage_data,
        frequency_count: historyForPunishment.length,
      };
    });
  }, [punishments, punishmentHistory]);


  return {
    punishments: punishmentsWithUsage, // Return punishments with calculated usage
    isLoadingPunishments,
    errorPunishments,
    refetchPunishments: refetchPunishments as () => Promise<QueryObserverResult<PunishmentData[], Error>>, // Cast for type safety

    punishmentHistory,
    isLoadingHistory,
    errorHistory,
    refetchHistory: refetchHistory as () => Promise<QueryObserverResult<PunishmentHistoryItem[], Error>>,

    savePunishment: savePunishmentMutation.mutateAsync,
    deletePunishment: deletePunishmentMutation.mutateAsync,
    applyPunishment: applyPunishmentMutation.mutateAsync,

    getPunishmentById,
    getPunishmentHistory,
    selectRandomPunishment,
    isSelectingRandom,
    setIsSelectingRandom,
    selectedPunishment,
    setSelectedPunishment,
    recentlyAppliedPunishments,
  };
};
