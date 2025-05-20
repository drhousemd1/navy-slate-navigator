
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import React from 'react'; // Removed useEffect
import AppRoutes from './AppRoutes';
import { Toaster } from '@/components/ui/toaster';
// import { supabase } from './integrations/supabase/client'; // No longer needed here
import { OfflineBanner } from './components/OfflineBanner';
// import { queryClient } from './data/queryClient'; // No longer needed here
import Hydrate from './components/Hydrate';
// import { purgeQueryCache } from './lib/react-query-config'; // No longer needed here
import { usePreloadAppCoreData } from '@/data/preload/usePreloadAppCoreData';

function App() {
  usePreloadAppCoreData();

  // useEffect(() => { // REMOVED THIS ENTIRE EFFECT
  //   const { data: { subscription: authStateUnsub } } = supabase.auth.onAuthStateChange(async (event, session) => { 
  //     console.log('Auth state change event:', event, "Session:", session);
  //     if (event === "SIGNED_OUT") {
  //       await purgeQueryCache(queryClient); 
  //       console.log('Full cache (in-memory and persisted) cleared on SIGNED_OUT.');
  //     }
  //   });
  //   return () => {
  //     authStateUnsub.unsubscribe();
  //   };
  // }, []);

  return (
    <Hydrate fallbackMessage="Failed to load application data. Please try clearing site data or contact support.">
      <Toaster />
      <AppRoutes />
      <OfflineBanner />
    </Hydrate>
  );
}

export default App;
