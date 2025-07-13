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

  // If no record exists, create one with default preferences
  if (!data) {
    const { data: created, error: createError } = await supabase
      .from('user_notification_preferences')
      .insert({ user_id: userId, preferences: DEFAULT_NOTIFICATION_PREFERENCES as any })
      .select('preferences')
      .single();

    if (createError) {
      console.error('Error creating notification preferences:', createError);
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    return (created.preferences as unknown as NotificationPreferences) || DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const preferences = data.preferences as unknown as NotificationPreferences;
  console.log('[fetchNotificationPreferences] Raw database data:', data.preferences);
  console.log('[fetchNotificationPreferences] Parsed preferences:', preferences);
  return preferences;
}