-- Update existing user notification preferences to include the new 'messages' type
-- This ensures existing users see the Messages toggle in their settings

UPDATE user_notification_preferences 
SET preferences = jsonb_set(
  preferences,
  '{types,messages}',
  'true'::jsonb
)
WHERE preferences->'types'->>'messages' IS NULL;