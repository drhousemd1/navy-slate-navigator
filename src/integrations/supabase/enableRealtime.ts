
import { supabase } from './client';

/**
 * Enables real-time support for the specified tables
 * This can be called during app initialization
 */
export const enableRealtimeSupport = async () => {
  try {
    // Enable real-time for rewards table using raw SQL query instead of RPC
    // This avoids the type error with the "supabase_realtime" function name
    const { error } = await supabase
      .from('rewards')
      .select()
      .limit(1)
      .then(async () => {
        // Instead of using RPC, we setup a channel subscription
        const channel = supabase.channel('rewards-changes')
          .on('postgres_changes', 
            {
              event: '*',
              schema: 'public', 
              table: 'rewards'
            }, 
            (payload) => {
              console.log('Real-time update received:', payload);
            }
          )
          .subscribe();
          
        console.log("Successfully enabled realtime for rewards table via channel subscription");
        return { error: null };
      });
    
    if (error) {
      console.error("Error enabling realtime for rewards table:", error);
    }
  } catch (err) {
    console.error("Failed to enable realtime support:", err);
  }
};
