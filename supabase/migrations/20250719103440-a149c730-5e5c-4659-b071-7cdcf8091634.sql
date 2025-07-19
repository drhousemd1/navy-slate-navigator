-- Add read_at field to messages table to track when messages are read
ALTER TABLE public.messages 
ADD COLUMN read_at timestamp with time zone DEFAULT NULL;

-- Add index for better performance when querying unread messages
CREATE INDEX idx_messages_read_at ON public.messages(receiver_id, read_at) WHERE read_at IS NULL;