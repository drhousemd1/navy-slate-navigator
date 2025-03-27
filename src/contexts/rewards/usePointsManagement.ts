
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const usePointsManagement = () => {
  const [totalPoints, setTotalPoints] = useState<number>(0);

  const fetchTotalPoints = useCallback(async () => {
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
          .select('points, id')
          .limit(1);
          
        data = response.data?.[0];
        error = response.error;
      }
      
      if (error && error.code === 'PGRST116') {
        // No data found - either no user or no profiles
        console.log('No points data found, creating initial profile');
        
        // Generate a random UUID for the profile if no user is authenticated
        const profileId = userId || crypto.randomUUID();
        
        // Create an initial profile with 0 points
        const { data: newProfileData, error: createError } = await supabase
          .from('profiles')
          .insert({ id: profileId, points: 0 })
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
      } else if (error) {
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
  }, []);

  useEffect(() => {
    fetchTotalPoints();
  }, [fetchTotalPoints]);

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
          setTotalPoints(newPoints); // Update UI immediately
          return true;
        } else {
          // Create a new profile with a randomly generated UUID
          const profileId = crypto.randomUUID();
          
          // Create a new profile
          const { data: newProfile, error } = await supabase
            .from('profiles')
            .insert({ id: profileId, points: newPoints })
            .select()
            .single();
            
          if (error) {
            console.error('Error creating profile:', error);
            return false;
          }
          
          console.log('Created new profile with points:', newPoints);
          setTotalPoints(newPoints); // Update UI immediately
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
      setTotalPoints(newPoints); // Update UI immediately
      return true;
    } catch (error) {
      console.error('Error in updatePointsInDatabase:', error);
      return false;
    }
  }, []);

  return {
    totalPoints,
    setTotalPoints,
    updatePointsInDatabase,
    refreshPointsFromDatabase: fetchTotalPoints
  };
};
