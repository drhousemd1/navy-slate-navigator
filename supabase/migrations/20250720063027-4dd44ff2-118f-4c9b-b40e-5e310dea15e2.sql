-- Add push_token column to profiles table for native mobile push notifications
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_token TEXT;