
// import { usePunishments } from '@/contexts/PunishmentsContext'; // No longer needed
// import { useRewards } from '@/contexts/RewardsContext'; // No longer needed
// import { toast } from "@/hooks/use-toast"; // Toasts are handled by the mutation hook
import { supabase } from '@/integrations/supabase/client';
// import { useQueryClient } from '@tanstack/react-query'; // Not directly needed here now
import { ApplyPunishmentArgs, PunishmentData } from '@/contexts/punishments/types';
import { useApplyPunishment } from '@/data/punishments/mutations/useApplyPunishment'; // Import the actual mutation hook
import { toast } from '@/hooks/use-toast'; // Keep for initial validation errors if any

interface UsePunishmentApplyProps {
  punishment: PunishmentData;
}

export const usePunishmentApply = ({ punishment }: UsePunishmentApplyProps) => {
  const applyPunishmentMutation = useApplyPunishment();
  
  const handlePunish = async () => {
    if (!punishment.id) {
      toast({
        title: 'Error',
        description: 'Cannot apply punishment: missing ID',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('dom_points, points')
          .eq('id', user.id)
          .single();
          
        if (profileError || !profileData) {
          toast({
            title: 'Error',
            description: 'Could not fetch user profile data.',
            variant: 'destructive',
          });
          console.error("Error fetching profile:", profileError);
          return;
        }
          
        const currentDomPoints = profileData.dom_points || 0;
        const currentSubPoints = profileData.points || 0;
        
        const args: ApplyPunishmentArgs = {
          id: punishment.id,
          costPoints: Math.abs(punishment.points),
          domEarn: punishment.dom_points !== undefined && punishment.dom_points !== null ? punishment.dom_points : Math.ceil(Math.abs(punishment.points) / 2),
          profileId: user.id,
          subPoints: currentSubPoints,
          domPoints: currentDomPoints
        };

        // Call the mutation. Toasts and query invalidations are handled within useApplyPunishment.
        await applyPunishmentMutation.mutateAsync(args);
        
        // Toasts for success/error are now handled by the useApplyPunishment hook.
        // Refreshing points and punishments list is also handled by query invalidations in useApplyPunishment.

      } else {
         toast({
            title: 'Error',
            description: 'User not authenticated.',
            variant: 'destructive',
          });
      }
    } catch (error) {
      // Errors from mutateAsync will be caught by the mutation's onError handler,
      // which will show a toast. Logging here is still useful for debugging.
      console.error('Error initiating apply punishment process:', error);
      // Avoid showing a duplicate toast if the mutation hook already showed one.
      // If the error is *before* calling mutateAsync (e.g., fetching user profile), this toast is fine.
      if (!applyPunishmentMutation.isError) { // Check if mutation itself errored
         toast({
            title: 'Error',
            description: 'Failed to apply punishment before submitting.', // More specific message
            variant: 'destructive',
          });
      }
    }
  };
  
  return { handlePunish, isLoading: applyPunishmentMutation.isPending }; // Expose loading state
};
