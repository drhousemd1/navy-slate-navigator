import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData, PunishmentHistoryItem, ApplyPunishmentArgs } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import {
  savePunishmentsToDB,
  savePunishmentHistoryToDB,
} from '../indexedDB/useIndexedDB';
import { useRewards } from '@/contexts/RewardsContext'; // For points updates
import { convertToMondayBasedIndex } from '@/lib/utils';
import { CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager'; // Added for query key
import { fetchPunishments } from './queries/fetchPunishments'; // Added for queryFn
import { fetchCurrentWeekPunishmentHistory } from './queries/fetchPunishmentHistory'; // Added for queryFn

// PUNISHMENTS_QUERY_KEY is now CRITICAL_QUERY_KEYS.PUNISHMENTS
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
    queryKey: CRITICAL_QUERY_KEYS.PUNISHMENTS, // Use critical query key
    queryFn: fetchPunishments, // Use standardized fetch function
    // React Query persister will handle IndexedDB caching.
    // Manual IndexedDB loading (loadPunishmentsFromDB) removed from here.
    // The `fetchPunishments` function will be called if data is stale or not in cache.
    // Preloading populates the cache, so this should hit the cache if preloading worked.
    staleTime: Infinity, // Keep data fresh indefinitely, rely on preloading/manual invalidation
    // gcTime, refetchOnWindowFocus, etc., will use queryClient defaults
  });

  const {
    data: punishmentHistory = [], 
    isLoading: isLoadingHistory,
    error: errorHistory,
    refetch: refetchHistory,
  } = useQuery<PunishmentHistoryItem[], Error>({
    queryKey: PUNISHMENT_HISTORY_QUERY_KEY,
    queryFn: fetchCurrentWeekPunishmentHistory, // Use standardized fetch function for history
    // React Query persister will handle IndexedDB caching for history too.
    // Manual IndexedDB loading (loadPunishmentHistoryFromDB) removed.
    staleTime: 1000 * 60 * 5, // 5 minutes, as it's not preloaded by usePreloadAppCoreData
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
        dataToSave.id = punishmentData.id || uuidv4(); 
        dataToSave.created_at = new Date().toISOString();
        const defaults: Partial<PunishmentData> = {
            title: '', points: 0, dom_supply: 0, 
            background_opacity: 50, title_color: '#FFFFFF',
            subtext_color: '#8E9196', calendar_color: '#ea384c', highlight_effect: false,
            icon_color: '#ea384c', focal_point_x: 50, focal_point_y: 50,
        };
        Object.assign(dataToSave, { ...defaults, ...dataToSave });

      } else {
        if (punishmentData.dom_supply === undefined && dataToSave.id) {
            // QueryClient getQueryData is non-blocking if data is available
            const existingPunishments = queryClient.getQueryData<PunishmentData[]>(CRITICAL_QUERY_KEYS.PUNISHMENTS) || [];
            const existingPunishment = existingPunishments.find(p => p.id === dataToSave.id);
            dataToSave.dom_supply = existingPunishment?.dom_supply ?? 0;
        }
      }
      
      const finalDataToSave = { ...dataToSave, id: dataToSave.id! } as PunishmentData;

      const { data, error } = await supabase.from('punishments').upsert(finalDataToSave).select().single();
      if (error) throw error;
      return data as PunishmentData;
    },
    onMutate: async (punishmentData) => {
      await queryClient.cancelQueries({ queryKey: CRITICAL_QUERY_KEYS.PUNISHMENTS });
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(CRITICAL_QUERY_KEYS.PUNISHMENTS);
      let optimisticPunishmentId: string | undefined;

      if (punishmentData.id) { 
        queryClient.setQueryData<PunishmentData[]>(CRITICAL_QUERY_KEYS.PUNISHMENTS, (old = []) =>
          old.map(p => p.id === punishmentData.id ? { ...p, ...punishmentData, dom_supply: punishmentData.dom_supply ?? p.dom_supply ?? 0, updated_at: new Date().toISOString() } as PunishmentData : p)
        );
      } else { 
        optimisticPunishmentId = uuidv4();
        const optimisticPunishment: PunishmentData = {
          id: optimisticPunishmentId,
          title: '', 
          points: 0, 
          dom_supply: 0, 
          background_opacity: 50, title_color: '#FFFFFF', subtext_color: '#8E9196', 
          calendar_color: '#ea384c', highlight_effect: false, icon_color: '#ea384c', 
          focal_point_x: 50, focal_point_y: 50,
          ...punishmentData, 
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        queryClient.setQueryData<PunishmentData[]>(CRITICAL_QUERY_KEYS.PUNISHMENTS, (old = []) => [optimisticPunishment, ...old]);
      }
      return { previousPunishments, optimisticPunishmentId };
    },
    onError: (error, _variables, context) => {
      if (context?.previousPunishments) {
        queryClient.setQueryData<PunishmentData[]>(CRITICAL_QUERY_KEYS.PUNISHMENTS, context.previousPunishments);
      }
      toast({ title: 'Error saving punishment', description: error.message, variant: 'destructive' });
    },
    onSuccess: async (data, _variables, context) => {
      queryClient.setQueryData<PunishmentData[]>(CRITICAL_QUERY_KEYS.PUNISHMENTS, (old = []) => {
        const newPunishments = old.map(p => 
          (context?.optimisticPunishmentId && p.id === context.optimisticPunishmentId) || p.id === data.id 
          ? { ...data, dom_supply: data.dom_supply ?? 0 } 
          : p
        );
        if (!context?.optimisticPunishmentId && !old.find(p => p.id === data.id)) {
          newPunishments.unshift({ ...data, dom_supply: data.dom_supply ?? 0 });
        }
        // Persister handles IndexedDB via queryClient state changes. 
        // Direct savePunishmentsToDB might be redundant if persister is working.
        // However, explicit save can ensure it's written, let's keep for now unless issues arise.
        savePunishmentsToDB(newPunishments.filter(p => p.id != null) as PunishmentData[]);
        return newPunishments;
      });
      toast({ title: 'Punishment saved successfully!' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.PUNISHMENTS });
    }
  });

  const deletePunishmentMutation = useMutation<void, Error, string, DeletePunishmentContext>({
    mutationFn: async (punishmentId) => {
      const { error } = await supabase.from('punishments').delete().eq('id', punishmentId);
      if (error) throw error;
    },
    onMutate: async (punishmentId) => {
      await queryClient.cancelQueries({ queryKey: CRITICAL_QUERY_KEYS.PUNISHMENTS });
      await queryClient.cancelQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });

      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(CRITICAL_QUERY_KEYS.PUNISHMENTS);
      const previousHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY);

      queryClient.setQueryData<PunishmentData[]>(CRITICAL_QUERY_KEYS.PUNISHMENTS, (old = []) => old.filter(p => p.id !== punishmentId));
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, (old = []) => old.filter(h => h.punishment_id !== punishmentId));
      
      return { previousPunishments, previousHistory };
    },
    onError: (error, _punishmentId, context) => {
      if (context?.previousPunishments) {
        queryClient.setQueryData<PunishmentData[]>(CRITICAL_QUERY_KEYS.PUNISHMENTS, context.previousPunishments);
      }
      if (context?.previousHistory) {
        queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, context.previousHistory);
      }
      toast({ title: 'Error deleting punishment', description: error.message, variant: 'destructive' });
    },
    onSuccess: async (_data, punishmentId) => {
      const currentPunishments = queryClient.getQueryData<PunishmentData[]>(CRITICAL_QUERY_KEYS.PUNISHMENTS) || [];
      await savePunishmentsToDB(currentPunishments.filter(p => p.id != null) as PunishmentData[]);
      const currentHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY) || [];
      await savePunishmentHistoryToDB(currentHistory);
      
      toast({ title: 'Punishment deleted successfully!' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.PUNISHMENTS });
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
    }
  });
  
  const applyPunishmentMutation = useMutation<void, Error, ApplyPunishmentArgs, ApplyPunishmentContext>({
    mutationFn: async (args: ApplyPunishmentArgs) => {
        const { id: punishmentId, costPoints, domEarn, profileId, subPoints } = args;

        const newSubPoints = subPoints - costPoints;
        const { error: subProfileError } = await supabase
            .from('profiles')
            .update({ points: newSubPoints, updated_at: new Date().toISOString() })
            .eq('id', profileId);
        if (subProfileError) throw new Error(`Failed to update submissive profile: ${subProfileError.message}`);

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

        const historyEntry: Omit<PunishmentHistoryItem, 'id' | 'applied_date'> & { punishment_id: string; applied_date?: string } = {
            punishment_id: punishmentId, 
            applied_date: new Date().toISOString(),
            points_deducted: costPoints,
            day_of_week: new Date().getDay(), 
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
        day_of_week: new Date().getDay(), 
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
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY }).then(() => {
        const currentHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY) || [];
        savePunishmentHistoryToDB(currentHistory); // Explicit save, similar to punishments
      });
      
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.PUNISHMENTS }); 
      
      await refreshPointsFromDatabase(); 
      toast({ title: 'Punishment applied successfully!' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.PUNISHMENTS });
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
    return randomPunishment;
  }, [punishments]);
  
  const recentlyAppliedPunishments = useMemo(() => {
    return [...punishmentHistory]
      .sort((a, b) => new Date(b.applied_date).getTime() - new Date(a.applied_date).getTime())
      .slice(0, 5);
  }, [punishmentHistory]);
  
  const punishmentsWithUsage = useMemo(() => {
    return punishments.map(punishment => {
      const historyForPunishment = punishmentHistory.filter(h => h.punishment_id === punishment.id);
      const usage_data = [0, 0, 0, 0, 0, 0, 0]; 
      historyForPunishment.forEach(item => {
        const dayIndex = convertToMondayBasedIndex(item.day_of_week); 
        if (dayIndex >= 0 && dayIndex < 7) {
          usage_data[dayIndex] += 1; 
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
    punishments: punishmentsWithUsage,
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
