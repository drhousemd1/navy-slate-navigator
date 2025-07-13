-- Update user_notification_preferences table default to have enabled: true
ALTER TABLE public.user_notification_preferences 
ALTER COLUMN preferences 
SET DEFAULT '{"enabled": true, "types": {"ruleBroken": true, "taskCompleted": true, "rewardPurchased": true, "rewardRedeemed": true, "punishmentPerformed": true, "wellnessUpdated": true, "wellnessCheckin": true}}'::jsonb;