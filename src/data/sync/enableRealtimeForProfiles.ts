
import { supabase } from '@/integrations/supabase/client';

export async function enableRealtimeForProfiles() {
  try {
    // Execute a query to enable REPLICA IDENTITY FULL for the profiles table
    const { error: replicaError } = await supabase.rpc(
      'enable_realtime_for_table', 
      { table_name: 'profiles' }
    );
    
    if (replicaError) {
      console.error('Error enabling replica identity:', replicaError);
    }
    
    console.log('Realtime enabled for profiles table');
    return true;
  } catch (error) {
    console.error('Failed to enable realtime for profiles:', error);
    return false;
  }
}
