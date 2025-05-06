
import { supabase } from './client';

/**
 * Enables real-time support for the specified tables
 * This can be called during app initialization
 */
export const enableRealtimeSupport = async () => {
  try {
    // Enable real-time for rewards table
    const { error } = await supabase.rpc('supabase_realtime', {
      table_name: 'rewards'
    });
    
    if (error) {
      console.error("Error enabling realtime for rewards table:", error);
    } else {
      console.log("Successfully enabled realtime for rewards table");
    }
  } catch (err) {
    console.error("Failed to enable realtime support:", err);
  }
};
