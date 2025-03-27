
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const usePointsManagement = () => {
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const { user, isAuthenticated } = useAuth();

  const fetchTotalPoints = useCallback(async () => {
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, returning 0 points');
      setTotalPoints(0);
      return;
    }

    try {
      console.log('Fetching points for authenticated user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', user.id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist yet, create one
          console.log('No profile found for user, creating one with 0 points');
          
          const { data: newProfileData, error: createError } = await supabase
            .from('profiles')
            .insert({ id: user.id, points: 0 })
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating profile:', createError);
            setTotalPoints(0);
            return;
          }
          
          console.log('Created new profile with points:', newProfileData.points);
          setTotalPoints(newProfileData.points);
          return;
        }
        
        console.error('Error fetching points:', error);
        setTotalPoints(0);
        return;
      }
      
      if (data) {
        console.log('Fetched points from database:', data.points);
        setTotalPoints(data.points);
      } else {
        console.log('No points data found, using default');
        setTotalPoints(0);
      }
    } catch (error) {
      console.error('Error fetching total points:', error);
      setTotalPoints(0);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTotalPoints();
    }
  }, [fetchTotalPoints, isAuthenticated]);

  const updatePointsInDatabase = useCallback(async (newPoints: number) => {
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, cannot update points');
      return false;
    }

    try {
      console.log('Updating points for user:', user.id, 'to', newPoints);
      
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (!existingProfile) {
        // Create a new profile
        const { error } = await supabase
          .from('profiles')
          .insert({ id: user.id, points: newPoints });
          
        if (error) {
          console.error('Error creating profile with points:', error);
          return false;
        }
        
        console.log('Created new profile with points:', newPoints);
        setTotalPoints(newPoints);
        return true;
      }
      
      // Update existing profile
      const { error } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error updating points in database:', error);
        throw error;
      }
      
      console.log('Points updated in database:', newPoints);
      setTotalPoints(newPoints);
      return true;
    } catch (error) {
      console.error('Error in updatePointsInDatabase:', error);
      return false;
    }
  }, [user, isAuthenticated]);

  return {
    totalPoints,
    setTotalPoints,
    updatePointsInDatabase,
    refreshPointsFromDatabase: fetchTotalPoints
  };
};
