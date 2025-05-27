
import { useState, useCallback } from 'react';
import { clearAuthState } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export function useDebugMode() {
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [clickCount, setClickCount] = useState<number>(0);

  const handleTitleClick = useCallback(() => {
    setClickCount(prevCount => {
      const newCount = prevCount + 1;
      if (newCount >= 5) {
        // Enable debug mode after 5 clicks
        setDebugMode(true);
        logger.debug('Debug mode enabled');
        return 0; // Reset click counter
      }
      return newCount;
    });
  }, []);

  const resetAuthState = useCallback(async () => {
    if (!debugMode) return;
    
    try {
      logger.debug('Manually clearing auth state');
      await clearAuthState();
      logger.debug('Auth state cleared successfully');
      return true;
    } catch (error) {
      logger.error('Error clearing auth state:', error);
      return false;
    }
  }, [debugMode]);

  return {
    debugMode,
    handleTitleClick,
    resetAuthState
  };
}
