
-- Create a function to handle the reward purchase transaction
CREATE OR REPLACE FUNCTION public.buy_reward(
  p_user_id UUID,
  p_reward_id UUID,
  p_cost INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_reward_id UUID;
  v_user_reward_supply INTEGER;
BEGIN
  -- Start transaction
  BEGIN
    -- Deduct points from user profile
    UPDATE public.profiles
    SET points = points - p_cost,
        updated_at = NOW()
    WHERE id = p_user_id
    AND points >= p_cost;
    
    -- If no rows were updated, the user didn't have enough points
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Not enough points to purchase this reward';
    END IF;
    
    -- Check if user already has this reward
    SELECT id, supply INTO v_user_reward_id, v_user_reward_supply
    FROM public.user_rewards
    WHERE user_id = p_user_id AND reward_id = p_reward_id;
    
    IF FOUND THEN
      -- Update existing user reward
      UPDATE public.user_rewards
      SET supply = v_user_reward_supply + 1,
          updated_at = NOW()
      WHERE id = v_user_reward_id;
    ELSE
      -- Create new user reward
      INSERT INTO public.user_rewards (user_id, reward_id, supply)
      VALUES (p_user_id, p_reward_id, 1);
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback is automatic in case of exception
      RAISE;
  END;
END;
$$;
