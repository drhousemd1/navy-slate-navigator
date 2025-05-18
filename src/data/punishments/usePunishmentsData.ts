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
import { convertToMondayBasedIndex } from '@/lib/utils'; // Corrected import

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
      const localData = await loadPunishmentsFromDB(); // Returns PunishmentData[] | null (id?: string)
      if (localData && localData.length > 0) {
        console.log('[usePunishmentsData] Loaded punishments from IndexedDB');
        return localData.map(p => ({ ...p, dom_supply: p.dom_supply ?? 0 }));
      }
      console.log('[usePunishmentsData] Fetching punishments from Supabase');
      const { data, error } = await supabase.from('punishments').select('*');
      if (error) throw error;
      const fetchedData = (data || []).map(p => ({ ...p, dom_supply: p.dom_supply ?? 0 })) as PunishmentData[];
      await savePunishmentsToDB(fetchedData.filter(p => p.id != null) as PunishmentData[]); // Ensure ID exists for DB save
      return fetchedData;
    },
    staleTime: Infinity,
  });

  const {
    data: punishmentHistory = [], // Default to empty array, type is PunishmentHistoryItem[]
    isLoading: isLoadingHistory,
    error: errorHistory,
    refetch: refetchHistory,
  } = useQuery<PunishmentHistoryItem[], Error>({
    queryKey: PUNISHMENT_HISTORY_QUERY_KEY,
    queryFn: async () => {
      const localData = await loadPunishmentHistoryFromDB(); // Returns PunishmentHistoryItem[] | null
      if (localData && localData.length > 0) {
        console.log('[usePunishmentsData] Loaded punishment history from IndexedDB');
        return localData;
      }
      console.log('[usePunishmentsData] Fetching punishment history from Supabase (or returning empty)');
      // Example: Fetch from Supabase if desired, otherwise rely on local-first for history.
      // For now, returning empty array if not in IndexedDB
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
            const existingPunishment = punishments.find(p => p.id === dataToSave.id);
            dataToSave.dom_supply = existingPunishment?.dom_supply ?? 0;
        }
      }
      
      const finalDataToSave = { ...dataToSave, id: dataToSave.id! } as PunishmentData;

      const { data, error } = await supabase.from('punishments').upsert(finalDataToSave).select().single();
      if (error) throw error;
      return data as PunishmentData;
    },
    onMutate: async (punishmentData) => {
      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY);
      let optimisticPunishmentId: string | undefined;

      if (punishmentData.id) { 
        queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) =>
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
      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) => {
        const newPunishments = old.map(p => 
          (context?.optimisticPunishmentId && p.id === context.optimisticPunishmentId) || p.id === data.id 
          ? { ...data, dom_supply: data.dom_supply ?? 0 } 
          : p
        );
        if (!context?.optimisticPunishmentId && !old.find(p => p.id === data.id)) {
          newPunishments.unshift({ ...data, dom_supply: data.dom_supply ?? 0 });
        }
        savePunishmentsToDB(newPunishments.filter(p => p.id != null) as PunishmentData[]);
        return newPunishments;
      });
      toast({ title: 'Punishment saved successfully!' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
    }
  });

  const deletePunishmentMutation = useMutation<void, Error, string, DeletePunishmentContext>({
    mutationFn: async (punishmentId) => {
      const { error } = await supabase.from('punishments').delete().eq('id', punishmentId);
      if (error) throw error;
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
      const currentPunishments = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY) || [];
      await savePunishmentsToDB(currentPunishments.filter(p => p.id != null) as PunishmentData[]); // Ensure IDs
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
            day_of_week: new Date().getDay(), // Use standard getDay()
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
        day_of_week: new Date().getDay(), // Use standard getDay()
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
        savePunishmentHistoryToDB(currentHistory);
      });
      
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY }); 
      
      await refreshPointsFromDatabase(); 
      toast({ title: 'Punishment applied successfully!' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
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
    console.log('[usePunishmentsData] Recalculating punishmentsWithUsage. History length:', punishmentHistory.length);
    return punishments.map(punishment => {
      const historyForPunishment = punishmentHistory.filter(h => h.punishment_id === punishment.id);
      const usage_data = [0, 0, 0, 0, 0, 0, 0]; 
      historyForPunishment.forEach(item => {
        // item.day_of_week is 0 (Sun) - 6 (Sat) from new Date().getDay()
        const dayIndex = convertToMondayBasedIndex(item.day_of_week); // convertToMondayBasedIndex handles 0-6 input
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
  }, [punishments, punishmentHistory, convertToMondayBasedIndex]);


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
