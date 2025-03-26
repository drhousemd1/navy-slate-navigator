
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EncyclopediaEntry } from '@/types/encyclopedia';
import { useToast } from './use-toast';

export const useEncyclopedia = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<EncyclopediaEntry | undefined>(undefined);

  // Fetch all encyclopedia entries
  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['encyclopedia-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('encyclopedia_entries')
        .select('*')
        .order('title');
      
      if (error) {
        console.error('Error fetching encyclopedia entries:', error);
        throw error;
      }
      
      return data as EncyclopediaEntry[];
    }
  });

  // Save an encyclopedia entry (create or update)
  const saveEntryMutation = useMutation({
    mutationFn: async (entry: EncyclopediaEntry) => {
      // Create a prepared entry object that matches the database schema
      // We need to make sure we're only including fields that exist in the database
      const preparedEntry = {
        id: entry.id,
        title: entry.title,
        subtext: entry.subtext,
        popup_text: entry.popup_text,
        image_url: entry.image_url,
        focal_point_x: entry.focal_point_x,
        focal_point_y: entry.focal_point_y,
        opacity: entry.opacity,
        title_color: entry.title_color,
        subtext_color: entry.subtext_color,
        highlight_effect: entry.highlight_effect
      };
      
      console.log('Saving entry:', preparedEntry);
      
      const { data, error } = await supabase
        .from('encyclopedia_entries')
        .upsert(preparedEntry)
        .select()
        .single();
      
      if (error) {
        console.error('Error saving encyclopedia entry:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encyclopedia-entries'] });
      toast({
        title: "Success",
        description: "Encyclopedia entry saved successfully."
      });
      closeModal();
    },
    onError: (error) => {
      console.error('Error in save mutation:', error);
      toast({
        title: "Error",
        description: "Failed to save encyclopedia entry.",
        variant: "destructive"
      });
    }
  });

  // Delete an encyclopedia entry
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('encyclopedia_entries')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting encyclopedia entry:', error);
        throw error;
      }
      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encyclopedia-entries'] });
      toast({
        title: "Deleted",
        description: "Encyclopedia entry deleted successfully."
      });
      closeModal();
    },
    onError: (error) => {
      console.error('Error in delete mutation:', error);
      toast({
        title: "Error",
        description: "Failed to delete encyclopedia entry.",
        variant: "destructive"
      });
    }
  });

  // Edit an existing entry
  const handleEditEntry = (id: string) => {
    const entryToEdit = entries.find(entry => entry.id === id);
    if (entryToEdit) {
      setCurrentEntry(entryToEdit);
      setIsEditModalOpen(true);
    }
  };

  // Create a new entry
  const handleCreateEntry = () => {
    setCurrentEntry(undefined);
    setIsEditModalOpen(true);
  };

  // Close the edit modal
  const closeModal = () => {
    setIsEditModalOpen(false);
    setCurrentEntry(undefined);
  };

  // Save an entry (create or update)
  const handleSaveEntry = (entry: EncyclopediaEntry) => {
    saveEntryMutation.mutate(entry);
  };

  // Delete an entry
  const handleDeleteEntry = (id: string) => {
    deleteEntryMutation.mutate(id);
  };

  return {
    entries,
    isLoading,
    error,
    isEditModalOpen,
    currentEntry,
    handleEditEntry,
    handleCreateEntry,
    closeModal,
    handleSaveEntry,
    handleDeleteEntry
  };
};
