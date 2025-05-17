
import { usePunishments } from '@/contexts/PunishmentsContext'; // Corrected: This should be from the new provider path if changed
import { useRewards } from '@/contexts/RewardsContext';
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
// import { REWARDS_DOM_POINTS_QUERY_KEY } from '@/data/rewards/queries'; // Not used currently
import { ApplyPunishmentArgs, PunishmentData } from '@/contexts/punishments/types'; // Ensure ApplyPunishmentArgs is imported

interface UsePunishmentApplyProps {
  punishment: PunishmentData; // Changed to accept the full punishment object
}

export const usePunishmentApply = ({ punishment }: UsePunishmentApplyProps) => {
  const { applyPunishment, refetchPunishments } = usePunishments();
  const { refreshPointsFromDatabase } = useRewards(); // totalPoints and setDomPoints removed as they should be fetched
  
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

        await applyPunishment(args);
          
        toast({
          title: 'Punishment Applied',
          description: `${Math.abs(punishment.points)} points deducted`,
        });
          
        await refetchPunishments();
        await refreshPointsFromDatabase();
      } else {
         toast({
            title: 'Error',
            description: 'User not authenticated.',
            variant: 'destructive',
          });
      }
    } catch (error) {
      console.error('Error applying punishment:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply punishment',
        variant: 'destructive',
      });
    }
  };
  
  return { handlePunish };
};
