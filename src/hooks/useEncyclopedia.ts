
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
  const [selectedTextRange, setSelectedTextRange] = useState<{ start: number; end: number } | null>(null);
  const [formattedSections, setFormattedSections] = useState<Array<{
    start: number;
    end: number;
    formatting: {
      isBold?: boolean;
      isUnderlined?: boolean;
      fontSize?: string;
    }
  }>>([]);

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
      const preparedEntry = {
        id: entry.id,
        title: entry.title,
        subtext: entry.subtext,
        popup_text: entry.popup_text,
        image_url: entry.image_url,
        focal_point_x: entry.focal_point_x,
        focal_point_y: entry.focal_point_y,
        opacity: entry.opacity,
        popup_opacity: entry.popup_opacity || entry.opacity, // Use tile opacity as default if popup opacity not set
        title_color: entry.title_color,
        subtext_color: entry.subtext_color,
        highlight_effect: entry.highlight_effect,
        popup_text_formatting: entry.popup_text_formatting || {
          isBold: false,
          isUnderlined: false,
          fontSize: '1rem'
        },
        formatted_sections: entry.formatted_sections || []
      };
      
      console.log('Saving entry with formatting:', preparedEntry.popup_text_formatting);
      console.log('Saving entry with formatted sections:', preparedEntry.formatted_sections);
      
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

  // Handle text selection for formatting
  const handleTextSelection = (selection: { start: number; end: number }) => {
    console.log("useEncyclopedia: Text selection received", selection);
    setSelectedTextRange(selection);
  };

  // Apply formatting to selected text
  const applyFormattingToSelection = (
    text: string, 
    formatting: { isBold?: boolean; isUnderlined?: boolean; fontSize?: string }
  ) => {
    if (!selectedTextRange) {
      console.log("No text range selected");
      return text;
    }
    
    const { start, end } = selectedTextRange;
    
    // Create a new formatted section just for the selected text range
    const newFormattedSection = {
      start,
      end,
      formatting: { ...formatting }
    };
    
    console.log(`Applied formatting to selected text from ${start} to ${end}:`, formatting);
    
    // Add the new section without affecting other sections
    const updatedSections = [...formattedSections, newFormattedSection];
    setFormattedSections(updatedSections);
    
    // If this is part of an entry being edited, update the entry
    if (currentEntry) {
      setCurrentEntry({
        ...currentEntry,
        formatted_sections: updatedSections
      });
    }
    
    // Clear the selection after applying
    setSelectedTextRange(null);
    
    return text;
  };

  // Load formatted sections when editing an entry
  const loadFormattedSections = (entry: EncyclopediaEntry) => {
    if (entry.formatted_sections) {
      setFormattedSections(entry.formatted_sections);
    } else {
      setFormattedSections([]);
    }
  };

  // Edit an existing entry
  const handleEditEntry = (id: string) => {
    const entryToEdit = entries.find(entry => entry.id === id);
    if (entryToEdit) {
      setCurrentEntry(entryToEdit);
      loadFormattedSections(entryToEdit);
      setIsEditModalOpen(true);
    }
  };

  // Create a new entry
  const handleCreateEntry = () => {
    setCurrentEntry(undefined);
    setFormattedSections([]);
    setIsEditModalOpen(true);
  };

  // Close the edit modal
  const closeModal = () => {
    setIsEditModalOpen(false);
    setCurrentEntry(undefined);
    setSelectedTextRange(null);
    setFormattedSections([]);
  };

  // Save an entry (create or update)
  const handleSaveEntry = (entry: EncyclopediaEntry) => {
    // Make sure to include formatted sections when saving
    const entryWithFormattedSections = {
      ...entry,
      formatted_sections: formattedSections
    };
    saveEntryMutation.mutate(entryWithFormattedSections);
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
    selectedTextRange,
    formattedSections,
    handleTextSelection,
    applyFormattingToSelection,
    handleEditEntry,
    handleCreateEntry,
    closeModal,
    handleSaveEntry,
    handleDeleteEntry
  };
};
