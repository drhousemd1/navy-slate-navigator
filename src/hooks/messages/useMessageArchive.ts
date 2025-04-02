
import { supabase } from '@/integrations/supabase/client';

export const useMessageArchive = () => {
  // Auto-archive old messages when we exceed 100
  const archiveOldMessages = async (userId: string, partnerId: string) => {
    if (!userId || !partnerId) return;

    // Count total messages between the users
    const { count, error: countError } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`);
    
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
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
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

  return {
    archiveOldMessages
  };
};
