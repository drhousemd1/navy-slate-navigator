
// import { usePunishments } from '@/contexts/PunishmentsContext'; // No longer needed
// import { useRewards } from '@/contexts/RewardsContext'; // No longer needed
// import { toast } from "@/hooks/use-toast"; // Toasts are handled by the mutation hook
import { supabase } from '@/integrations/supabase/client';
// import { useQueryClient } from '@tanstack/react-query'; // Not directly needed here now
import { ApplyPunishmentArgs, PunishmentData } from '@/contexts/punishments/types';
import { useApplyPunishment } from '@/data/punishments/mutations/useApplyPunishment';
import { toast } from '@/hooks/use-toast';

interface UsePunishmentApplyProps {
  punishment: PunishmentData;
}

export const usePunishmentApply = ({ punishment }: UsePunishmentApplyProps) => {
  const applyPunishmentMutation = useApplyPunishment();
  
  const handlePunish = async () => {
    console.log('[usePunishmentApply] handlePunish called for punishment ID:', punishment.id);
    if (!punishment.id) {
      toast({
        title: 'Error',
        description: 'Cannot apply punishment: missing ID',
        variant: 'destructive',
      });
      console.error('[usePunishmentApply] Punishment ID is missing.');
      return;
    }
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[usePunishmentApply] Error getting user from supabase.auth.getUser():', userError);
        toast({ title: 'Authentication Error', description: 'Could not verify user session. Please try logging in again.', variant: 'destructive' });
        return;
      }
      
      if (user) {
        console.log('[usePunishmentApply] User verified:', user.id, 'Proceeding to fetch profile.');
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
          console.error("[usePunishmentApply] Error fetching profile:", profileError, "Profile data:", profileData);
          return;
        }
        console.log('[usePunishmentApply] Profile data fetched:', profileData);
          
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

        console.log('[usePunishmentApply] Calling applyPunishmentMutation.mutateAsync with args:', args);
        // Session check before mutation
        const { data: { session: currentSessionBeforeMutation } } = await supabase.auth.getSession();
        if (!currentSessionBeforeMutation) {
            console.error('[usePunishmentApply] CRITICAL: No active session before calling mutateAsync. Aborting.');
            toast({ title: 'Session Error', description: 'Your session has expired. Please log in again.', variant: 'destructive' });
            // Potentially trigger a sign out or redirect here if appropriate
            // await supabase.auth.signOut(); // Example, might be too aggressive
            return;
        }
        console.log('[usePunishmentApply] Session active before mutateAsync. User ID:', currentSessionBeforeMutation.user.id);

        await applyPunishmentMutation.mutateAsync(args);
        console.log('[usePunishmentApply] applyPunishmentMutation.mutateAsync completed.');
        
      } else {
         console.warn('[usePunishmentApply] No authenticated user found by supabase.auth.getUser().');
         toast({
            title: 'Error',
            description: 'User not authenticated. Please log in.',
            variant: 'destructive',
          });
      }
    } catch (error) {
      console.error('[usePunishmentApply] Error in handlePunish process:', error);
      if (!applyPunishmentMutation.isError) {
         toast({
            title: 'Error',
            description: `Failed to apply punishment: ${error instanceof Error ? error.message : 'Unknown error'}`,
            variant: 'destructive',
          });
      }
    }
  };
  
  return { handlePunish, isLoading: applyPunishmentMutation.isPending };
};
