-- Create a trigger to automatically seed notification preferences for new users
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_notification_preferences (user_id, preferences)
  VALUES (
    NEW.id, 
    '{"enabled": true, "types": {"ruleBroken": true, "taskCompleted": true, "rewardPurchased": true, "rewardRedeemed": true, "punishmentPerformed": true, "wellnessUpdated": true, "wellnessCheckin": true, "messages": true}}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- Create trigger to run when a new user is created
CREATE OR REPLACE TRIGGER on_auth_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_notification_preferences();