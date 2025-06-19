
-- Enable Row Level Security on the rules table
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own rules and their partner's rules
CREATE POLICY "Users can view own and partner rules" ON public.rules
FOR SELECT USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT linked_partner_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND linked_partner_id IS NOT NULL
  )
);

-- Create policy for users to insert their own rules
CREATE POLICY "Users can insert own rules" ON public.rules
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create policy for users to update their own rules
CREATE POLICY "Users can update own rules" ON public.rules
FOR UPDATE USING (user_id = auth.uid());

-- Create policy for users to delete their own rules
CREATE POLICY "Users can delete own rules" ON public.rules
FOR DELETE USING (user_id = auth.uid());
