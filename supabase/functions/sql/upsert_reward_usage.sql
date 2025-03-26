
-- Create a stored procedure to upsert reward usage data
CREATE OR REPLACE FUNCTION public.upsert_reward_usage(
  user_id_param UUID,
  reward_id_param UUID,
  day_of_week_param INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO reward_usage (user_id, reward_id, day_of_week, used_at)
  VALUES (user_id_param, reward_id_param, day_of_week_param, now())
  ON CONFLICT (user_id, reward_id, day_of_week)
  DO UPDATE SET used_at = now();
END;
$$;
