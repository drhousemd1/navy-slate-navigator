
-- Create the card_images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'card_images',
  'card_images', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);

-- Create RLS policy for card_images bucket that allows users to access their own files
-- Users can access files in folders named with their user_id
CREATE POLICY "Users can view their own card images"
ON storage.objects FOR SELECT
USING (bucket_id = 'card_images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can insert their own card images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'card_images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own card images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'card_images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own card images"
ON storage.objects FOR DELETE
USING (bucket_id = 'card_images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add image_meta JSONB column to all relevant tables
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS image_meta JSONB DEFAULT NULL;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS image_meta JSONB DEFAULT NULL;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS image_meta JSONB DEFAULT NULL;
ALTER TABLE punishments ADD COLUMN IF NOT EXISTS image_meta JSONB DEFAULT NULL;
ALTER TABLE encyclopedia_entries ADD COLUMN IF NOT EXISTS image_meta JSONB DEFAULT NULL;

-- Create indexes on image_meta columns for performance
CREATE INDEX IF NOT EXISTS idx_tasks_image_meta ON tasks USING GIN (image_meta);
CREATE INDEX IF NOT EXISTS idx_rules_image_meta ON rules USING GIN (image_meta);
CREATE INDEX IF NOT EXISTS idx_rewards_image_meta ON rewards USING GIN (image_meta);
CREATE INDEX IF NOT EXISTS idx_punishments_image_meta ON punishments USING GIN (image_meta);
CREATE INDEX IF NOT EXISTS idx_encyclopedia_image_meta ON encyclopedia_entries USING GIN (image_meta);
