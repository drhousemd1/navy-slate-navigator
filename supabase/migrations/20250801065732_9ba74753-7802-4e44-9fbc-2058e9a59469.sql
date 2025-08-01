-- Clean up multiple subscriptions and add constraints
-- Remove duplicate subscriptions keeping only the most recent one per user
DELETE FROM user_push_subscriptions
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM user_push_subscriptions
  ORDER BY user_id, created_at DESC
);

-- Add unique constraint to prevent future duplicate subscriptions
ALTER TABLE user_push_subscriptions
ADD CONSTRAINT unique_user_subscription UNIQUE (user_id);

-- Create function to validate partner relationship for notifications
CREATE OR REPLACE FUNCTION public.can_notify_user(sender_id uuid, target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  -- Allow if sender is the target (self-notification)
  SELECT CASE 
    WHEN sender_id = target_id THEN true
    -- Allow if sender and target are linked partners
    WHEN EXISTS (
      SELECT 1 FROM public.profiles p1, public.profiles p2
      WHERE p1.id = sender_id 
        AND p2.id = target_id
        AND (p1.linked_partner_id = p2.id OR p2.linked_partner_id = p1.id)
    ) THEN true
    ELSE false
  END;
$$;