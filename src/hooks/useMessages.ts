
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
}

export const useMessages = (partnerId?: string) => {
  const { user } = useAuth();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  
  // Get the current user's partner ID if not provided
  const getPartnerId = async (): Promise<string | undefined> => {
    if (partnerId) return partnerId;
    if (!user) return undefined;
    
    try {
      // Get the current user's linked partner from the profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('linked_partner_id')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error getting partner ID:', error);
        return undefined;
      }
      
      return data.linked_partner_id;
    } catch (err) {
      console.error('Error in getPartnerId:', err);
      return undefined;
    }
  };

  // Fetch messages between the current user and their partner
  const {
    data: messages = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['messages', user?.id, partnerId],
    queryFn: async () => {
      const partnerIdValue = await getPartnerId();
      if (!user || !partnerIdValue) {
        return [];
      }

      // Fetch the most recent 25 messages
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerIdValue}),and(sender_id.eq.${partnerIdValue},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(25);
      
      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
      
      // Return messages in ascending order for display (newest at bottom)
      return [...(data || [])].reverse();
    },
    enabled: !!user
  });

  // Load older messages (for pagination)
  const loadOlderMessages = async (oldestMessageDate: string): Promise<Message[]> => {
    const partnerIdValue = await getPartnerId();
    if (!user || !partnerIdValue) {
      return [];
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerIdValue}),and(sender_id.eq.${partnerIdValue},receiver_id.eq.${user.id})`)
      .lt('created_at', oldestMessageDate)
      .order('created_at', { ascending: false })
      .limit(25);
    
    if (error) {
      console.error('Error loading older messages:', error);
      return [];
    }
    
    return data || [];
  };

  // Send a new message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ 
      content, 
      receiverId, 
      imageUrl = null 
    }: { 
      content: string; 
      receiverId: string; 
      imageUrl?: string | null 
    }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content,
          image_url: imageUrl
        })
        .select();
      
      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
      
      return data[0];
    },
    onSuccess: () => {
      // We don't need to invalidate the query here since we're using real-time updates
      setImageFile(null);
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Upload image to Supabase storage
  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('message_images')
        .upload(filePath, file);
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('message_images')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error uploading image",
        description: "Could not upload the image. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Send a message with optional image
  const sendMessage = async (content: string, receiverId: string) => {
    let imageUrl = null;
    
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
    }
    
    return sendMessageMutation.mutate({ content, receiverId, imageUrl });
  };

  // Auto-archive old messages when we exceed 100
  const archiveOldMessages = async () => {
    const partnerIdValue = await getPartnerId();
    if (!user || !partnerIdValue) return;

    // Count total messages between the users
    const { count, error: countError } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerIdValue}),and(sender_id.eq.${partnerIdValue},receiver_id.eq.${user.id})`);
    
    if (countError) {
      console.error('Error counting messages:', countError);
      return;
    }
    
    // If we have more than 100 messages, archive the oldest ones
    if (count && count > 100) {
      const toArchive = count - 100;
      
      // Get the oldest messages
      const { data: oldestMessages, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerIdValue}),and(sender_id.eq.${partnerIdValue},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(toArchive);
      
      if (fetchError || !oldestMessages) {
        console.error('Error fetching oldest messages:', fetchError);
        return;
      }
      
      // Insert into archived_messages
      const { error: archiveError } = await supabase
        .from('archived_messages')
        .insert(oldestMessages);
      
      if (archiveError) {
        console.error('Error archiving messages:', archiveError);
        return;
      }
      
      // Delete from messages
      const idsToDelete = oldestMessages.map(m => m.id);
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .in('id', idsToDelete);
      
      if (deleteError) {
        console.error('Error deleting archived messages:', deleteError);
      }
    }
  };

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${user.id},receiver_id=eq.${user.id}`
      }, (payload) => {
        // Add the new message to the messages list if it's relevant
        const newMessage = payload.new as Message;
        
        // Check if this message is relevant to our conversation
        getPartnerId().then(partnerIdValue => {
          if (
            (newMessage.sender_id === user.id && newMessage.receiver_id === partnerIdValue) ||
            (newMessage.sender_id === partnerIdValue && newMessage.receiver_id === user.id)
          ) {
            // Trigger a refetch to get the latest messages
            refetch();
            
            // Check if we need to archive old messages
            archiveOldMessages();
          }
        });
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    loadOlderMessages,
    imageFile,
    setImageFile,
    isUploading
  };
};
