
import { usePunishments } from '@/contexts/PunishmentsContext';
import { useRewards } from '@/contexts/RewardsContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UsePunishmentApplyProps {
  id?: string;
  points: number;
}

export const usePunishmentApply = ({ id, points }: UsePunishmentApplyProps) => {
  const { applyPunishment, refetchPunishments } = usePunishments();
  const { totalPoints, refreshPointsFromDatabase } = useRewards();
  
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
      // Apply the punishment which deducts points from the submissive user
      await applyPunishment({
        id: id,
        points: Math.abs(points) // Ensure points is positive (will be negated in the backend)
      });
      
      // Award dom points (half the punishment points) to the dom user
      const domPointsToAdd = Math.ceil(Math.abs(points) / 2);
      
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
          
          await supabase
            .from('profiles')
            .update({ dom_points: newDomPoints })
            .eq('id', user.id);
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
