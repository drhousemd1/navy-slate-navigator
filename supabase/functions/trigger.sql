
-- Note: This is a new file to update the handle_new_user function if it exists in Supabase

-- If you have an existing handle_new_user function in Supabase, update it to start with 0 points:
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, points)
  VALUES (NEW.id, 0);  -- Start with 0 points
  RETURN NEW;
END;
$$;
