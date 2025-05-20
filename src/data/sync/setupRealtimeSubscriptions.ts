
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/data/queryClient';
import { getProfilePointsQueryKey } from '@/data/points/usePointsManager';

// Enable realtime subscriptions for the entire application
export function setupRealtimeSubscriptions() {
  // Set up a subscription for profile changes (points updates)
  const profilesChannel = supabase
    .channel('profile-changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
    }, (payload) => {
      // When a profile is updated, update the cache
      const userId = payload.new.id;
      if (userId) {
        // Update the profile points in the cache
        queryClient.setQueryData(getProfilePointsQueryKey(userId), {
          points: payload.new.points,
          dom_points: payload.new.dom_points
        });
        
        // Update legacy cache keys
        queryClient.setQueryData(['rewards', 'points', userId], payload.new.points);
        queryClient.setQueryData(['rewards', 'dom_points', userId], payload.new.dom_points);
        
        // Update general profile data
        queryClient.setQueryData(['profile', userId], (old: any) => {
          return { ...old, ...payload.new };
        });
        
        // Notify components that data has changed
        queryClient.invalidateQueries({ queryKey: getProfilePointsQueryKey(userId) });
      }
    })
    .subscribe();

  // Return a cleanup function
  return () => {
    supabase.removeChannel(profilesChannel);
  };
}

// Export a hook to use in the app's startup
export function useRealtimeSubscriptions() {
  return {
    setupRealtimeSubscriptions
  };
}
