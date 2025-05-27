
import { useState, useCallback } from 'react';
import { clearAuthState } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger'; // Added logger import

export function useDebugMode() {
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [clickCount, setClickCount] = useState<number>(0);

  const handleTitleClick = useCallback(() => {
    setClickCount(prevCount => {
      const newCount = prevCount + 1;
      if (newCount >= 5) {
        // Enable debug mode after 5 clicks
        setDebugMode(true);
        logger.log('Debug mode enabled'); // Replaced console.log
        return 0; // Reset click counter
      }
      return newCount;
    });
  }, []);

  const resetAuthState = useCallback(async () => {
    if (!debugMode) return;
    
    try {
      logger.log('Manually clearing auth state'); // Replaced console.log
      await clearAuthState();
      logger.log('Auth state cleared successfully'); // Replaced console.log
      return true;
    } catch (error) {
      logger.error('Error clearing auth state:', error); // Replaced console.error
      return false;
    }
  }, [debugMode]);

  return {
    debugMode,
    handleTitleClick,
    resetAuthState
  };
}

