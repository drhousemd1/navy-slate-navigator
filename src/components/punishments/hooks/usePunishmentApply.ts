
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePunishments } from '@/contexts/PunishmentsContext';
import { toast } from '@/hooks/use-toast';

interface UsePunishmentApplyProps {
  id?: string;
  points: number;
}

export const usePunishmentApply = ({ id, points }: UsePunishmentApplyProps) => {
  const [isApplying, setIsApplying] = useState(false);
  const { applyPunishment } = usePunishments();
  
  const handlePunish = async () => {
    if (!id) {
      console.error("Cannot apply punishment: No punishment ID");
      toast({
        title: "Error",
        description: "Cannot apply punishment. Missing punishment ID.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsApplying(true);
      
      // First try the context method
      try {
        await applyPunishment(id, points);
        
        toast({
          title: "Punishment Applied",
          description: `${points} points have been deducted`,
        });
        
        return;
      } catch (contextError) {
        console.warn("Context method failed, trying direct database update", contextError);
      }
      
      // Fallback to direct Supabase call if context method fails
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData || !userData.user) {
        throw new Error("Not authenticated");
      }
      
      const { error } = await supabase.from("punishment_history").insert({
        punishment_id: id,
        user_id: userData.user.id,
        points_deducted: points,
        applied_date: new Date().toISOString()
      });
      
      if (error) throw error;
      
      // Also update the user's points in profiles table
      const { error: profileError } = await supabase.rpc('deduct_points', { 
        points_to_deduct: points 
      });
      
      if (profileError) {
        console.warn("Could not update points balance", profileError);
      }
      
      toast({
        title: "Punishment Applied",
        description: `${points} points have been deducted`,
      });
      
    } catch (error) {
      console.error("Failed to apply punishment:", error);
      toast({
        title: "Error",
        description: "Failed to apply punishment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };
  
  return {
    handlePunish,
    isApplying
  };
};
