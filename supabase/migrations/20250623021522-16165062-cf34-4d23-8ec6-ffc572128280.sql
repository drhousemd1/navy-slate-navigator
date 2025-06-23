
-- Add role column to profiles table with strict validation
ALTER TABLE public.profiles 
ADD COLUMN role TEXT CHECK (role IN ('sub', 'dom'));

-- Set default role for existing users (they can change this later in Profile settings)
UPDATE public.profiles 
SET role = 'sub' 
WHERE role IS NULL;

-- Make role column NOT NULL after setting defaults
ALTER TABLE public.profiles 
ALTER COLUMN role SET NOT NULL;

-- Create index for better performance on role-based queries
CREATE INDEX idx_profiles_role ON public.profiles(role);
