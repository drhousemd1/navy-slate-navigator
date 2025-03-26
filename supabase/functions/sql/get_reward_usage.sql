
-- Create a stored procedure to get reward usage data for a user
CREATE OR REPLACE FUNCTION public.get_reward_usage(user_id_param UUID)
RETURNS TABLE (
  reward_id UUID,
  day_of_week INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ru.reward_id, ru.day_of_week
  FROM reward_usage ru
  WHERE ru.user_id = user_id_param;
END;
$$;
