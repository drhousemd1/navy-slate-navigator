
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';
import { REWARDS_POINTS_QUERY_KEY } from '@/data/rewards/queries';

interface RedeemPunishmentParams {
  punishment: PunishmentData;
}

export function useRedeemPunishment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ punishment }: RedeemPunishmentParams): Promise<void> => {
      try {
        // Get current user
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          throw new Error('User not authenticated');
        }
        
        const now = new Date();
        const dayOfWeek = now.getDay();
        
        // Record the punishment in history
        const { error: historyError } = await supabase
          .from('punishment_history')
          .insert({
            punishment_id: punishment.id,
            applied_date: now.toISOString(),
            day_of_week: dayOfWeek,
            points_deducted: punishment.points || 0
          });
          
        if (historyError) {
          throw historyError;
        }
        
        // Reduce points if applicable
        if (punishment.points && punishment.points > 0) {
          // Instead of using RPC, update the points directly with a query
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('points')
            .eq('id', userData.user.id)
            .single();
            
          if (profileError) {
            throw profileError;
          }
          
          const currentPoints = profileData.points || 0;
          const newPoints = Math.max(0, currentPoints - punishment.points);
          
          const { error: pointsError } = await supabase
            .from('profiles')
            .update({ points: newPoints })
            .eq('id', userData.user.id);
            
          if (pointsError) {
            throw pointsError;
          }
        }
        
        return;
      } catch (err) {
        console.error('Error redeeming punishment:', err);
        throw err;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
      
      toast({
        title: 'Punishment Applied',
        description: 'Punishment has been recorded'
      });
    },
    onError: (error: Error) => {
      console.error('Error in useRedeemPunishment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to apply punishment',
        variant: 'destructive'
      });
    }
  });
}
