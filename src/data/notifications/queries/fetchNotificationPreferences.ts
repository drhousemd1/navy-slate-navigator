import { supabase } from "@/integrations/supabase/client";
import type { NotificationPreferences } from "../types";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../types";

export async function fetchNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching notification preferences:', error);
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  return (data?.preferences as unknown as NotificationPreferences) || DEFAULT_NOTIFICATION_PREFERENCES;
}