
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const usePointsManagement = () => {
  const [totalPoints, setTotalPoints] = useState<number>(0);

  useEffect(() => {
    const fetchTotalPoints = async () => {
      try {
        // Attempt to get user auth data first
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;
        
        let data;
        let error;
        
        if (userId) {
          // If authenticated, get points for this user
          console.log('Fetching points for authenticated user:', userId);
          const response = await supabase
            .from('profiles')
            .select('points')
            .eq('id', userId)
            .single();
            
          data = response.data;
          error = response.error;
        } else {
          // If not authenticated, get the first profile or any record
          console.log('No authenticated user, fetching first available profile');
          const response = await supabase
            .from('profiles')
            .select('points')
            .limit(1);
            
          data = response.data?.[0];
          error = response.error;
        }
        
        if (error && error.code === 'PGRST116') {
          // No data found - either no user or no profiles
          console.log('No points data found, creating initial profile with default points');
          
          // Create a default profile
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({ points: 500 })
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating default profile:', createError);
            setTotalPoints(500);
            return;
          }
          
          if (newProfile) {
            console.log('Created new profile with points:', newProfile.points);
            setTotalPoints(newProfile.points);
            return;
          }
        } else if (error) {
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
        console.log('No authenticated user, updating first available profile');
        
        // Get first profile if exists
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
          
        if (profiles && profiles.length > 0) {
          // Update the existing profile
          const { error } = await supabase
            .from('profiles')
            .update({ points: newPoints })
            .eq('id', profiles[0].id);
          
          if (error) {
            console.error('Error updating points without auth:', error);
            return false;
          }
          
          console.log('Points updated for existing profile:', newPoints);
          return true;
        } else {
          // Create a new profile
          const { error } = await supabase
            .from('profiles')
            .insert({ points: newPoints });
          
          if (error) {
            console.error('Error creating profile with points:', error);
            return false;
          }
          
          console.log('Created new profile with points:', newPoints);
          return true;
        }
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
