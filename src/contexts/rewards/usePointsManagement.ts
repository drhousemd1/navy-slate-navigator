
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const usePointsManagement = () => {
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [domPoints, setDomPoints] = useState<number>(0);
  const { user, isAuthenticated } = useAuth();

  const fetchTotalPoints = useCallback(async () => {
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, returning 0 points');
      setTotalPoints(0);
      setDomPoints(0);
      return;
    }

    try {
      console.log('Fetching points for authenticated user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('points, dom_points')
        .eq('id', user.id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist yet, create one
          console.log('No profile found for user, creating one with 0 points');
          
          const { data: newProfileData, error: createError } = await supabase
            .from('profiles')
            .insert({ id: user.id, points: 0, dom_points: 0 })
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating profile:', createError);
            setTotalPoints(0);
            setDomPoints(0);
            return;
          }
          
          console.log('Created new profile with points:', newProfileData.points, 'and dom_points:', newProfileData.dom_points || 0);
          setTotalPoints(newProfileData.points);
          setDomPoints(newProfileData.dom_points || 0);
          return;
        }
        
        console.error('Error fetching points:', error);
        setTotalPoints(0);
        setDomPoints(0);
        return;
      }
      
      if (data) {
        console.log('Fetched points from database:', data.points, 'and dom_points:', data.dom_points || 0);
        setTotalPoints(data.points);
        setDomPoints(data.dom_points || 0);
      } else {
        console.log('No points data found, using default');
        setTotalPoints(0);
        setDomPoints(0);
      }
    } catch (error) {
      console.error('Error fetching total points:', error);
      setTotalPoints(0);
      setDomPoints(0);
    }
  }, [user, isAuthenticated]);

  // Add this effect to check for auth changes and refresh points
  useEffect(() => {
    if (isAuthenticated) {
      fetchTotalPoints();
    }
  }, [fetchTotalPoints, isAuthenticated]);

  // Also add an effect to listen to auth state changes
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      if (isAuthenticated) {
        fetchTotalPoints();
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchTotalPoints, isAuthenticated]);

  const updatePointsInDatabase = useCallback(async (newPoints: number) => {
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, cannot update points');
      return false;
    }

    try {
      console.log('Updating points for user:', user.id, 'to', newPoints);
      
      // First check if the profile exists with a more reliable method
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id);
      
      if (fetchError) {
        console.error('Error checking if profile exists:', fetchError);
        return false;
      }
      
      // If profile exists, update it, otherwise create it
      if (existingProfile && existingProfile.length > 0) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ points: newPoints })
          .eq('id', user.id);
        
        if (updateError) {
          console.error('Error updating points in database:', updateError);
          throw updateError;
        }
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ id: user.id, points: newPoints, dom_points: 0 });
        
        if (insertError) {
          console.error('Error creating profile with points:', insertError);
          return false;
        }
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
    domPoints,
    setTotalPoints,
    updatePointsInDatabase,
    refreshPointsFromDatabase: fetchTotalPoints
  };
};
