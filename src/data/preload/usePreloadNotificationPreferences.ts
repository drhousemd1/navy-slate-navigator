import { useAuth } from '@/contexts/AuthContext';
import { preloadNotificationPreferences } from '../notifications/useNotificationPreferencesData';

export function usePreloadNotificationPreferences() {
  const { user } = useAuth();
  
  return async () => {
    if (!user?.id) return null;
    
    return preloadNotificationPreferences(user.id);
  };
}