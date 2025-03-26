
-- Create a stored procedure to delete reward usage data
CREATE OR REPLACE FUNCTION public.delete_reward_usage(
  reward_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM reward_usage WHERE reward_id = reward_id_param;
END;
$$;
