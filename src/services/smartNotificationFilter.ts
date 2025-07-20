import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationFilter {
  isAppActive: boolean;
  isQuietHours: boolean;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface SmartFilterConfig {
  enableAppActivityDetection: boolean;
  enableQuietHours: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "08:00"
  allowCriticalDuringQuietHours: boolean;
}

class SmartNotificationFilter {
  private isAppVisible = true;
  private lastActivity = Date.now();
  private config: SmartFilterConfig = {
    enableAppActivityDetection: true,
    enableQuietHours: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    allowCriticalDuringQuietHours: true
  };

  constructor() {
    this.setupActivityDetection();
  }

  private setupActivityDetection() {
    // Track document visibility
    document.addEventListener('visibilitychange', () => {
      this.isAppVisible = !document.hidden;
      if (this.isAppVisible) {
        this.lastActivity = Date.now();
      }
      logger.info('App visibility changed:', this.isAppVisible ? 'visible' : 'hidden');
    });

    // Track user activity
    const updateActivity = () => {
      this.lastActivity = Date.now();
    };

    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Track focus/blur
    window.addEventListener('focus', () => {
      this.isAppVisible = true;
      this.lastActivity = Date.now();
    });

    window.addEventListener('blur', () => {
      this.isAppVisible = false;
    });
  }

  private isInQuietHours(): boolean {
    if (!this.config.enableQuietHours) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = this.config.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = this.config.quietHoursEnd.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  private isAppActive(): boolean {
    if (!this.config.enableAppActivityDetection) return false;
    
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
    const isRecentlyActive = (Date.now() - this.lastActivity) < inactiveThreshold;
    
    return this.isAppVisible && isRecentlyActive;
  }

  public shouldFilterNotification(priority: NotificationFilter['priority']): { 
    shouldFilter: boolean; 
    reason?: string;
  } {
    // Critical notifications always go through
    if (priority === 'critical') {
      return { shouldFilter: false };
    }

    // Check quiet hours
    const inQuietHours = this.isInQuietHours();
    if (inQuietHours) {
      if (priority === 'high' && this.config.allowCriticalDuringQuietHours) {
        return { shouldFilter: false };
      }
      return { 
        shouldFilter: true, 
        reason: 'Filtered due to quiet hours' 
      };
    }

    // Check app activity for non-critical notifications
    if (this.isAppActive() && (priority === 'low' || priority === 'normal')) {
      return { 
        shouldFilter: true, 
        reason: 'User is actively using the app' 
      };
    }

    return { shouldFilter: false };
  }

  public updateConfig(newConfig: Partial<SmartFilterConfig>) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Smart filter config updated:', this.config);
  }

  public getConfig(): SmartFilterConfig {
    return { ...this.config };
  }

  public getStatus() {
    return {
      isAppVisible: this.isAppVisible,
      lastActivity: new Date(this.lastActivity),
      isInQuietHours: this.isInQuietHours(),
      isAppActive: this.isAppActive()
    };
  }
}

// Singleton instance
export const smartNotificationFilter = new SmartNotificationFilter();

export const useSmartNotificationFilter = () => {
  const { user } = useAuth();

  const loadUserFilterConfig = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('user_notification_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .single();

      if (data?.preferences && typeof data.preferences === 'object') {
        const prefs = data.preferences as any;
        if (prefs.smartFilter) {
          smartNotificationFilter.updateConfig(prefs.smartFilter);
        }
      }
    } catch (error) {
      logger.error('Error loading smart filter config:', error);
    }
  };

  const saveUserFilterConfig = async (config: Partial<SmartFilterConfig>) => {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('user_notification_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .single();

      let existingPrefs = {};
      if (existing?.preferences && typeof existing.preferences === 'object') {
        existingPrefs = existing.preferences as any;
      }

      const updatedPreferences = {
        ...existingPrefs,
        smartFilter: {
          ...smartNotificationFilter.getConfig(),
          ...config
        }
      };

      await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          preferences: updatedPreferences
        });

      smartNotificationFilter.updateConfig(config);
    } catch (error) {
      logger.error('Error saving smart filter config:', error);
    }
  };

  return {
    loadUserFilterConfig,
    saveUserFilterConfig,
    getConfig: () => smartNotificationFilter.getConfig(),
    getStatus: () => smartNotificationFilter.getStatus(),
    shouldFilter: (priority: NotificationFilter['priority']) => 
      smartNotificationFilter.shouldFilterNotification(priority)
  };
};