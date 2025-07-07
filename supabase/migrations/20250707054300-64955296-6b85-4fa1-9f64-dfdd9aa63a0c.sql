-- Create wellbeing_snapshots table for mood/wellbeing tracking
CREATE TABLE public.wellbeing_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_score INTEGER NOT NULL DEFAULT 50 CHECK (overall_score >= 0 AND overall_score <= 100)
);

-- Create index for faster user lookups
CREATE INDEX idx_wellbeing_snapshots_user_id ON public.wellbeing_snapshots(user_id);
CREATE INDEX idx_wellbeing_snapshots_created_at ON public.wellbeing_snapshots(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.wellbeing_snapshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies following the app's partner access pattern
CREATE POLICY "Allow access to owner or linked partner" 
ON public.wellbeing_snapshots 
FOR ALL 
USING ((auth.uid() = user_id) OR (auth.uid() = (
  SELECT linked_partner_id 
  FROM public.profiles 
  WHERE id = wellbeing_snapshots.user_id
)));

-- Create policy for inserting own wellbeing data
CREATE POLICY "Users can create their own wellbeing snapshots" 
ON public.wellbeing_snapshots 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_wellbeing_snapshots_updated_at
BEFORE UPDATE ON public.wellbeing_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();