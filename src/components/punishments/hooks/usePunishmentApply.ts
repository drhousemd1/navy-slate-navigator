
import { usePunishments } from '@/contexts/PunishmentsContext';
import { useRewards } from '@/contexts/RewardsContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { REWARDS_DOM_POINTS_QUERY_KEY } from '@/data/rewards/queries';
import { PunishmentData } from '@/contexts/punishments/types';

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
      // Create a simplified punishment object with just the needed properties
      const punishment: PunishmentData = {
        id: id,
        points: Math.abs(points),
        title: 'Apply Punishment' // Add required title property
      };
      
      // Apply the punishment which deducts points from the submissive user
      await applyPunishment(punishment);
      
      // Award dom points to the dom user
      // Use the explicit dom_points value if provided, otherwise calculate it
      const domPointsToAdd = dom_points !== undefined ? dom_points : Math.ceil(Math.abs(points) / 2);
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch the dom_points from the profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('dom_points')
          .eq('id', user.id)
          .single();
          
        if (!error && data) {
          // Update the dom_points in the profiles table
          const currentDomPoints = data.dom_points || 0;
          const newDomPoints = currentDomPoints + domPointsToAdd;
          
          // First update the React Query cache with optimistic value
          queryClient.setQueryData(REWARDS_DOM_POINTS_QUERY_KEY, newDomPoints);
          
          // Then update the database
          await setDomPoints(newDomPoints);
        }
      }
      
      // Show success message
      toast({
        title: 'Punishment Applied',
        description: `${Math.abs(points)} points deducted and ${domPointsToAdd} dom points awarded`,
      });
      
      // Refresh the data
      await refetchPunishments();
      await refreshPointsFromDatabase();
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
