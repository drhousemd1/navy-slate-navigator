import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
// Define ProfileUpdate if it's a specific structure, otherwise use Record<string, any>
// For example: interface ProfileUpdate { points?: number; dom_points?: number; }

export function useRedeemPunishment() {
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Ensure user is available and has an ID

  return useMutation<
    void, // onSuccess data type
    Error, // onError error type
    { punishmentId: string; pointsToModify: number; isDomPoints: boolean; userId: string }, // Variables type
    unknown // Context type
  >(async ({ punishmentId, pointsToModify, isDomPoints, userId: targetUserId }) => {
    // const currentUserId = user?.id; // The user performing the action
    // if (!currentUserId) {
    //   toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
    //   throw new Error("User not authenticated");
    // }

    if (!targetUserId) {
        toast({ title: "Error", description: "Target user ID is missing.", variant: "destructive" });
        throw new Error("Target user ID is missing");
    }

    try {
      const pointsColumn = isDomPoints ? 'dom_points' : 'points';

      // Fetch current points for the target user
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select(pointsColumn)
        .eq('id', targetUserId)
        .single();

      if (fetchError) throw fetchError;
      if (!profile) throw new Error(`Profile not found for user ${targetUserId}`);

      const currentPoints = (profile[pointsColumn] as number) || 0;
      const newPoints = Math.max(0, currentPoints + pointsToModify); // Ensure points don't go below 0

      // Update points for the target user
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [pointsColumn]: newPoints })
        .eq('id', targetUserId);

      if (updateError) throw updateError;

      // Record punishment redemption or history (if applicable)
      // Example:
      // await supabase.from('punishment_redemptions').insert({ punishment_id: punishmentId, user_id: targetUserId, points_modified: pointsToModify });

      toast({ title: 'Punishment Processed', description: `Points ${pointsToModify > 0 ? 'added' : 'deducted'}. New balance processed.` });
      logger.info(`Punishment ${punishmentId} processed for user ${targetUserId}. Points modified by ${pointsToModify}.`);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['userPoints', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-dom-points', targetUserId] });
      // queryClient.invalidateQueries({ queryKey: ['punishments'] }); // If punishment state changes

    } catch (error: unknown) {
      const message = getErrorMessage(error);
      toast({ title: 'Error Processing Punishment', description: message, variant: 'destructive' });
      logger.error('Error processing punishment:', message, error);
      throw error; // Re-throw for useMutation's onError
    }
  });
}
