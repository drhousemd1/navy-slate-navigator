import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem, ApplyPunishmentArgs } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { savePunishmentHistoryToDB, savePunishmentsToDB } from '@/data/indexedDB/useIndexedDB'; 
import { PUNISHMENTS_QUERY_KEY, PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries';

// Define necessary keys directly or ensure they are imported from a valid source
const PROFILE_QUERY_KEY = ['profile'];
const REWARDS_POINTS_QUERY_KEY = ['rewardsPoints'];
const REWARDS_DOM_POINTS_QUERY_KEY = ['rewardsDomPoints'];

interface ApplyPunishmentContext {
  previousHistory?: PunishmentHistoryItem[];
  optimisticHistoryId?: string;
}

export const useApplyPunishment = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ApplyPunishmentArgs, ApplyPunishmentContext>({
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
        const { data: savedHistory, error: historyError } = await supabase.from('punishment_history').insert(historyEntry).select().single();
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY }); 
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }); // Replaced CRITICAL_QUERY_KEYS.PROFILE
      await queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY }); // Replaced CRITICAL_QUERY_KEYS.REWARDS_POINTS
      await queryClient.invalidateQueries({ queryKey: REWARDS_DOM_POINTS_QUERY_KEY }); // Replaced CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS
      
      const currentHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY) || [];
      await savePunishmentHistoryToDB(currentHistory);
      
      toast({ title: 'Punishment applied successfully!' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }); // Replaced CRITICAL_QUERY_KEYS.PROFILE
      queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY }); // Replaced CRITICAL_QUERY_KEYS.REWARDS_POINTS
      queryClient.invalidateQueries({ queryKey: REWARDS_DOM_POINTS_QUERY_KEY }); // Replaced CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS
    }
  });
};
