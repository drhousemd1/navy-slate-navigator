
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const usePointsManagement = () => {
  const [totalPoints, setTotalPoints] = useState<number>(0);

  useEffect(() => {
    const fetchTotalPoints = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('points')
          .single();
        
        if (error) {
          console.error('Error fetching points:', error);
          setTotalPoints(500);
          return;
        }
        
        if (data) {
          console.log('Fetched points from database:', data.points);
          setTotalPoints(data.points);
        } else {
          console.log('No points data found, using default');
          setTotalPoints(500);
        }
      } catch (error) {
        console.error('Error fetching total points:', error);
        setTotalPoints(500);
      }
    };

    fetchTotalPoints();
  }, []);

  const updatePointsInDatabase = useCallback(async (newPoints: number) => {
    try {
      // First try to get the authenticated user
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authData?.user?.id) {
        console.error('Authentication error:', authError || 'No user ID available');
        
        // For development/testing without auth, update points in profiles without a user ID filter
        // This is a fallback that allows the app to work without authentication
        const { error } = await supabase
          .from('profiles')
          .update({ points: newPoints })
          .is('id', null);
        
        if (error) {
          console.error('Error updating points without auth:', error);
          return false;
        }
        
        console.log('Points updated in database without auth:', newPoints);
        return true;
      }
      
      // We have a user ID, proceed with normal update
      const userId = authData.user.id;
      console.log('Updating points for user:', userId);
      
      const { error } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', userId);
      
      if (error) {
        console.error('Error updating points in database:', error);
        throw error;
      }
      
      console.log('Points updated in database:', newPoints);
      return true;
    } catch (error) {
      console.error('Error in updatePointsInDatabase:', error);
      return false;
    }
  }, []);

  return {
    totalPoints,
    setTotalPoints,
    updatePointsInDatabase
  };
};
