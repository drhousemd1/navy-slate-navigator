
import { supabase } from '@/integrations/supabase/client';

export async function enableRealtimeForTable(tableName: string) {
  try {
    // First, set REPLICA IDENTITY to FULL for the table
    const { error: replicaError } = await supabase.rpc(
      'execute_sql',
      { sql: `ALTER TABLE ${tableName} REPLICA IDENTITY FULL;` }
    );
    
    if (replicaError) {
      console.error(`Error setting REPLICA IDENTITY for ${tableName}:`, replicaError);
      return false;
    }
    
    // Then add the table to the supabase_realtime publication
    const { error: pubError } = await supabase.rpc(
      'execute_sql',
      { sql: `ALTER PUBLICATION supabase_realtime ADD TABLE ${tableName};` }
    );
    
    if (pubError) {
      console.error(`Error adding ${tableName} to realtime publication:`, pubError);
      return false;
    }
    
    console.log(`Realtime enabled for ${tableName}`);
    return true;
  } catch (error) {
    console.error(`Failed to enable realtime for ${tableName}:`, error);
    return false;
  }
}

// Initialize all database settings needed for the app
export async function initializeDatabase() {
  // Enable realtime for profiles table
  await enableRealtimeForTable('profiles');
}
