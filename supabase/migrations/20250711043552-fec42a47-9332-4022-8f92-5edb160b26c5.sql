-- Ensure notification preferences table has proper structure for persisting data
-- Update default preferences to ensure notifications can be properly enabled/disabled
ALTER TABLE public.user_notification_preferences 
ALTER COLUMN preferences 
SET DEFAULT '{"enabled": false, "types": {"ruleBroken": true, "taskCompleted": true, "rewardPurchased": true, "rewardRedeemed": true, "punishmentPerformed": true, "wellnessUpdated": true, "wellnessCheckin": true}}'::jsonb;