import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

export const PUNISHMENTS_QUERY_KEY = ['punishments'];
export const USER_POINTS_QUERY_KEY = ['user', 'points'];
export const USER_DOM_POINTS_QUERY_KEY = ['user', 'dom_points'];
export const USER_PROFILE_QUERY_KEY = ['user', 'profile'];
export const USER_PUNISHMENT_HISTORY_QUERY_KEY = ['user', 'punishment-history'];

interface RedeemPunishmentVariables {
  punishmentId: string;
  pointsToDeduct: number;
  userId: string;
  // Add other relevant fields if needed for the punishment_history table
}

interface ProfileUpdateData {
  points?: number;
  dom_points?: number;
  // Add other updatable profile fields if necessary
}

export const useRedeemPunishment = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, RedeemPunishmentVariables>(
    async ({ punishmentId, pointsToDeduct, userId }) => {
      try {
        // Deduct points from user's profile
        const { data: currentProfile, error: profileError } = await supabase
          .from('profiles')
          .select('points, dom_points')
          .eq('id', userId)
          .single();

        if (profileError) {
          logger.error('Error fetching user profile:', profileError.message);
          throw new Error(`Failed to fetch user profile: ${profileError.message}`);
        }

        if (!currentProfile) {
          throw new Error('User profile not found.');
        }

        const newPoints = Math.max(0, (currentProfile.points || 0) - pointsToDeduct);

        // Optimistically update the user's points
        queryClient.setQueryData(USER_POINTS_QUERY_KEY, newPoints);

        // Update the user's points in the database
        const profileUpdate: ProfileUpdateData = { points: newPoints };
        const { error: updateError } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('id', userId);

        if (updateError) {
          logger.error('Error updating user profile:', updateError.message);
          throw new Error(`Failed to update user profile: ${updateError.message}`);
        }

        // Insert record into punishment_history
        const { error: historyError } = await supabase
          .from('punishment_history')
          .insert([{ user_id: userId, punishment_id: punishmentId, points_deducted: pointsToDeduct }]);

        if (historyError) {
          logger.warn('Failed to record punishment history:', historyError.message);
          // Consider whether to throw an error or just log it
        }

        logger.debug(`User ${userId} redeemed punishment ${punishmentId}, deducting ${pointsToDeduct} points.`);
      } catch (error: unknown) {
        const descriptiveMessage = getErrorMessage(error);
        logger.error('Error redeeming punishment:', descriptiveMessage, error);
        toast({
          title: 'Redemption Failed',
          description: descriptiveMessage,
          variant: 'destructive',
        });
        throw new Error(`Failed to redeem punishment: ${descriptiveMessage}`);
      }
    },
    {
      onSuccess: () => {
        // Invalidate queries to update UI
        queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: USER_POINTS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: USER_DOM_POINTS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: USER_PROFILE_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: USER_PUNISHMENT_HISTORY_QUERY_KEY });
        toast({
          title: 'Punishment Redeemed',
          description: 'Points have been successfully deducted.',
        });
      },
      onError: (error: Error) => {
        logger.error('Redeem Punishment Mutation failed:', error.message);
        toast({
          title: 'Redemption Failed',
          description: error.message,
          variant: 'destructive',
        });
      },
      onSettled: () => {
        // Can perform cleanup or final actions here
      },
    }
  );
};
