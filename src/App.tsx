
import React, { useEffect } from 'react';
import { setupRealtimeSubscriptions } from './data/sync/setupRealtimeSubscriptions';
import { initializeDatabase } from './data/sync/initializeDatabase';
import './App.css';
import AppRoutes from './AppRoutes';
import { supabase } from './integrations/supabase/client';

function App() {
  // Initialize database settings when app loads
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if user is authenticated
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          // Only try to initialize if user is logged in
          await initializeDatabase();
        }
      } catch (error) {
        console.error("Error initializing database:", error);
      }
    };
    
    initialize();
  }, []);
  
  // Set up realtime subscriptions
  useEffect(() => {
    const cleanup = setupRealtimeSubscriptions();
    return cleanup;
  }, []);

  return (
    <AppRoutes />
  );
}

export default App;
