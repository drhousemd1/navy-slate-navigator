-- Create user_color_schemes table to store user's selected color scheme preference
CREATE TABLE public.user_color_schemes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheme_name TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_color_schemes ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own color scheme" 
ON public.user_color_schemes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own color scheme" 
ON public.user_color_schemes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own color scheme" 
ON public.user_color_schemes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own color scheme" 
ON public.user_color_schemes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_user_color_schemes_updated_at
BEFORE UPDATE ON public.user_color_schemes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();