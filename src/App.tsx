
import React, { useEffect } from 'react';
import { setupRealtimeSubscriptions } from './data/sync/setupRealtimeSubscriptions';
// import { initializeDatabase } from './data/sync/initializeDatabase'; // Removed
import './App.css';
import AppRoutes from './AppRoutes';
// import { supabase } from './integrations/supabase/client'; // Removed if not used elsewhere in this file

function App() {
  // Initialize database settings when app loads - THIS IS REMOVED
  // useEffect(() => {
  //   const initialize = async () => {
  //     try {
  //       // Check if user is authenticated
  //       const { data } = await supabase.auth.getUser();
  //       if (data.user) {
  //         // Only try to initialize if user is logged in
  //         // await initializeDatabase(); // Removed
  //       }
  //     } catch (error) {
  //       console.error("Error initializing database:", error);
  //     }
  //   };
    
  //   initialize();
  // }, []);
  
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

