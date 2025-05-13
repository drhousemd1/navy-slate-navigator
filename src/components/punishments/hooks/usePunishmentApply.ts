
import { usePunishments } from '@/contexts/PunishmentsContext';
import { useRewards } from '@/contexts/RewardsContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { REWARDS_DOM_POINTS_QUERY_KEY } from '@/data/rewards/queries';

interface UsePunishmentApplyProps {
  id?: string;
  points: number;
  dom_points?: number;
}

export const usePunishmentApply = ({ id, points, dom_points }: UsePunishmentApplyProps) => {
  const { applyPunishment, refetchPunishments } = usePunishments();
  const { totalPoints, refreshPointsFromDatabase, setDomPoints } = useRewards();
  const queryClient = useQueryClient();
  
  const handlePunish = async () => {
    if (!id) {
      toast({
        title: 'Error',
        description: 'Cannot apply punishment: missing ID',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch the dom_points from the profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('dom_points, points')
          .eq('id', user.id)
          .single();
          
        if (!error && data) {
          const currentDomPoints = data.dom_points || 0;
          const currentPoints = data.points || 0;
          
          // Apply the punishment with corrected parameter structure
          await applyPunishment({
            id,
            costPoints: Math.abs(points),
            domEarn: dom_points !== undefined ? dom_points : Math.ceil(Math.abs(points) / 2),
            profileId: user.id,
            subPoints: currentPoints,
            domPoints: currentDomPoints
          });
          
          // Show success message
          toast({
            title: 'Punishment Applied',
            description: `${Math.abs(points)} points deducted`,
          });
          
          // Refresh the data
          await refetchPunishments();
          await refreshPointsFromDatabase();
        }
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
