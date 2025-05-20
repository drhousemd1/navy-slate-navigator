
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
          .select('dom_points, points') // Ensure these are the correct column names
          .eq('id', user.id)
          .single();
          
        if (profileError || !profileData) {
          toast({
            title: 'Error',
            description: 'Could not fetch user profile data for punishment.', // Specific message
            variant: 'destructive',
          });
          console.error("Error fetching profile for punishment:", profileError);
          return;
        }
          
        const currentSubPoints = profileData.points ?? 0; // Use 'points' for sub_points
        const currentDomPoints = profileData.dom_points ?? 0;
        
        const args: ApplyPunishmentArgs = {
          id: punishment.id, // Punishment ID
          costPoints: Math.abs(punishment.points), // Cost to submissive
          domEarn: punishment.dom_points !== undefined && punishment.dom_points !== null 
                     ? punishment.dom_points 
                     : Math.ceil(Math.abs(punishment.points) / 2), // DOM points earned by dominant
          profileId: user.id, // ID of the submissive (current user in this context)
          subPoints: currentSubPoints, // Submissive's current sub_points
          domPoints: currentDomPoints  // Submissive's current dom_points
        };

        console.log("Calling applyPunishmentMutation with args:", args);
        await applyPunishmentMutation.mutateAsync(args);
        
      } else {
         toast({
            title: 'Authentication Error',
            description: 'User not authenticated. Please log in to apply punishment.', // Clearer message
            variant: 'destructive',
          });
      }
    } catch (error: any) {
      console.error('Error initiating apply punishment process:', error);
      // Avoid showing a duplicate toast if the mutation hook already showed one.
      // This toast is for errors *before* calling mutateAsync (e.g., fetching user profile).
      if (!applyPunishmentMutation.isError && !error.message.includes("supabase.auth.getUser")) {
         toast({
            title: 'Punishment Failed',
            description: error.message || 'An unexpected error occurred before submitting the punishment.',
            variant: 'destructive',
          });
      }
    }
  };
  
  return { handlePunish, isLoading: applyPunishmentMutation.isPending }; 
};
