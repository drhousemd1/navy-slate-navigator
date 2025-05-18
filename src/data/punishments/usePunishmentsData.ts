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

interface SavePunishmentContext {
  previousPunishments?: PunishmentData[];
  optimisticPunishmentId?: string;
}

interface DeletePunishmentContext {
  previousPunishments?: PunishmentData[];
  previousHistory?: PunishmentHistoryItem[];
}

interface ApplyPunishmentContext {
  previousHistory?: PunishmentHistoryItem[];
  optimisticHistoryId?: string;
}


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
      if (localData && localData.length > 0) {
        console.log('[usePunishmentsData] Loaded punishments from IndexedDB');
        // Ensure dom_supply is present, default if not (for older local data)
        return localData.map(p => ({ ...p, dom_supply: p.dom_supply ?? 0 }));
      }
      console.log('[usePunishmentsData] Fetching punishments from Supabase');
      const { data, error } = await supabase.from('punishments').select('*');
      if (error) throw error;
      // Data from Supabase should now include dom_supply due to migration
      const fetchedData = (data || []).map(p => ({ ...p, dom_supply: p.dom_supply ?? 0 })) as PunishmentData[];
      await savePunishmentsToDB(fetchedData);
      return fetchedData;
    },
    staleTime: Infinity,
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
        console.log('[usePunishmentsData] Loaded punishment history from IndexedDB');
        return localData;
      }
      console.log('[usePunishmentsData] Fetching punishment history from Supabase (or returning empty)');
      // Example: Fetch from Supabase if desired, otherwise rely on local-first for history.
      // const { data, error } = await supabase.from('punishment_history').select('*');
      // if (error) throw error;
      // await savePunishmentHistoryToDB(data || []);
      // return data || [];
      return []; 
    },
    staleTime: 1000 * 60 * 5, 
  });

  // --- Mutations ---
  const savePunishmentMutation = useMutation<PunishmentData, Error, Partial<PunishmentData>, SavePunishmentContext>({
    mutationFn: async (punishmentData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const isUpdate = !!punishmentData.id;
      const dataToSave: Partial<PunishmentData> = {
        ...punishmentData,
        updated_at: new Date().toISOString(),
      };

      if (!isUpdate) { // Create new
        dataToSave.id = punishmentData.id || uuidv4(); // Use optimistic ID if provided, else new
        dataToSave.created_at = new Date().toISOString();
        // Ensure all required fields have defaults if not provided
        const defaults: Partial<PunishmentData> = {
            title: '', points: 0, dom_supply: 0, // Added dom_supply default
            background_opacity: 50, title_color: '#FFFFFF',
            subtext_color: '#8E9196', calendar_color: '#ea384c', highlight_effect: false,
            icon_color: '#ea384c', focal_point_x: 50, focal_point_y: 50,
        };
        Object.assign(dataToSave, { ...defaults, ...dataToSave });

      } else {
        // For updates, ensure dom_supply is included if provided, otherwise it remains unchanged by Supabase
        if (punishmentData.dom_supply === undefined && dataToSave.id) {
            const existingPunishment = punishments.find(p => p.id === dataToSave.id);
            dataToSave.dom_supply = existingPunishment?.dom_supply ?? 0;
        }
      }
      
      const { data, error } = await supabase.from('punishments').upsert(dataToSave as PunishmentData).select().single();
      if (error) throw error;
      return data as PunishmentData;
    },
    onMutate: async (punishmentData) => {
      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY);
      let optimisticPunishmentId: string | undefined;

      if (punishmentData.id) { // Update
        queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) =>
          old.map(p => p.id === punishmentData.id ? { ...p, ...punishmentData, dom_supply: punishmentData.dom_supply ?? p.dom_supply ?? 0, updated_at: new Date().toISOString() } as PunishmentData : p)
        );
      } else { // Create
        optimisticPunishmentId = uuidv4();
        const optimisticPunishment: PunishmentData = {
          id: optimisticPunishmentId,
          title: '', // Default or from punishmentData
          points: 0, // Default or from punishmentData
          dom_supply: 0, // Added dom_supply default for optimistic create
          // Add all required fields with defaults
          background_opacity: 50, title_color: '#FFFFFF', subtext_color: '#8E9196', 
          calendar_color: '#ea384c', highlight_effect: false, icon_color: '#ea384c', 
          focal_point_x: 50, focal_point_y: 50,
          ...punishmentData, // Spread incoming data
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as PunishmentData; // Cast carefully
        queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) => [optimisticPunishment, ...old]);
      }
      return { previousPunishments, optimisticPunishmentId };
    },
    onError: (error, _variables, context) => {
      if (context?.previousPunishments) {
        queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, context.previousPunishments);
      }
      toast({ title: 'Error saving punishment', description: error.message, variant: 'destructive' });
    },
    onSuccess: async (data, _variables, context) => {
      // data is the punishment returned from supabase
      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) => {
        const newPunishments = old.map(p => 
          (context?.optimisticPunishmentId && p.id === context.optimisticPunishmentId) || p.id === data.id 
          ? { ...data, dom_supply: data.dom_supply ?? 0 } // Ensure dom_supply is set from DB response
          : p
        );
        // If create and it wasn't in the list by optimisticId (e.g. if optimisticId wasn't set)
        if (!context?.optimisticPunishmentId && !old.find(p => p.id === data.id)) {
          newPunishments.unshift({ ...data, dom_supply: data.dom_supply ?? 0 });
        }
        savePunishmentsToDB(newPunishments);
        return newPunishments;
      });
      toast({ title: 'Punishment saved successfully!' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY }); // To ensure consistency if any complex logic was missed
    }
  });

  const deletePunishmentMutation = useMutation<void, Error, string, DeletePunishmentContext>({
    mutationFn: async (punishmentId) => {
      const { error } = await supabase.from('punishments').delete().eq('id', punishmentId);
      if (error) throw error;
      // Also delete related history from DB if necessary, or handle via cascade
      // For now, client side handles history cache filtering in onMutate/onSuccess
    },
    onMutate: async (punishmentId) => {
      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });

      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY);
      const previousHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY);

      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) => old.filter(p => p.id !== punishmentId));
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, (old = []) => old.filter(h => h.punishment_id !== punishmentId));
      
      return { previousPunishments, previousHistory };
    },
    onError: (error, _punishmentId, context) => {
      if (context?.previousPunishments) {
        queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, context.previousPunishments);
      }
      if (context?.previousHistory) {
        queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, context.previousHistory);
      }
      toast({ title: 'Error deleting punishment', description: error.message, variant: 'destructive' });
    },
    onSuccess: async (_data, punishmentId) => {
      // Data already updated optimistically, now persist to IndexedDB
      const currentPunishments = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY) || [];
      await savePunishmentsToDB(currentPunishments);
      const currentHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY) || [];
      await savePunishmentHistoryToDB(currentHistory);
      
      toast({ title: 'Punishment deleted successfully!' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
    }
  });
  
  const applyPunishmentMutation = useMutation<void, Error, ApplyPunishmentArgs, ApplyPunishmentContext>({
    mutationFn: async (args: ApplyPunishmentArgs) => {
        const { id: punishmentId, costPoints, domEarn, profileId, subPoints } = args; // domPoints removed from args as it's not used for calculations here

        // 1. Deduct points from submissive's profile
        const newSubPoints = subPoints - costPoints;
        const { error: subProfileError } = await supabase
            .from('profiles')
            .update({ points: newSubPoints, updated_at: new Date().toISOString() })
            .eq('id', profileId);
        if (subProfileError) throw new Error(`Failed to update submissive profile: ${subProfileError.message}`);

        // 2. Add points to dominant's profile
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
        const historyEntry: Omit<PunishmentHistoryItem, 'id' | 'applied_date'> & { applied_date?: string } = {
            punishment_id: punishmentId,
            applied_date: new Date().toISOString(), // Server will set its own timestamp primarily
            points_deducted: costPoints,
            day_of_week: getDayOfWeek(new Date()),
        };
        const { error: historyError } = await supabase.from('punishment_history').insert(historyEntry).select().single();
        if (historyError) throw new Error(`Failed to record punishment history: ${historyError.message}`);
    },
    onMutate: async (args) => {
      await queryClient.cancelQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      const previousHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY);
      
      const optimisticHistoryId = uuidv4();
      const optimisticHistoryEntry: PunishmentHistoryItem = {
        id: optimisticHistoryId,
        punishment_id: args.id,
        applied_date: new Date().toISOString(),
        points_deducted: args.costPoints,
        day_of_week: getDayOfWeek(new Date()),
      };
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, (old = []) => 
        [optimisticHistoryEntry, ...old]
      );
      return { previousHistory, optimisticHistoryId };
    },
    onError: (error, _args, context) => {
      if (context?.previousHistory) {
        queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, context.previousHistory);
      }
      toast({ title: 'Error applying punishment', description: error.message, variant: 'destructive' });
    },
    onSuccess: async (_data, args, context) => {
      // The history item from DB isn't directly returned to replace optimistic one,
      // so we invalidate to get the accurate list including the new item.
      // Alternatively, the mutationFn could return the created history item.
      // For now, invalidation is safer.
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY }).then(() => {
        const currentHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY) || [];
        savePunishmentHistoryToDB(currentHistory);
      });
      
      // Invalidate punishments to update usage_data calculated from history
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY }); 
      
      await refreshPointsFromDatabase(); // Refresh global points
      toast({ title: 'Punishment applied successfully!' });
    },
    onSettled: () => {
      // Invalidate again to be sure, especially for points related data.
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      // Consider invalidating profile points query key if it exists
    }
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
    console.log('[usePunishmentsData] Recalculating punishmentsWithUsage. History length:', punishmentHistory.length);
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
    refetchPunishments: refetchPunishments as () => Promise<QueryObserverResult<PunishmentData[], Error>>,

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
