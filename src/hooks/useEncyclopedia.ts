import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { EncyclopediaEntry } from '@/types/encyclopedia';

export const useEncyclopedia = () => {
  // Fetch all encyclopedia entries
  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['encyclopedia-entries'],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from('encyclopedia_entries')
        .select('*')
        .order('title');
      
      if (error) {
        console.error('Error fetching encyclopedia entries:', error);
        throw error;
      }
      
      // Transform the data to match our expected types
      return (data || []).map(item => {
        // Handle formatted_sections conversion from JSON to our expected type
        const formattedSections = item.formatted_sections 
          ? (item.formatted_sections as unknown as Array<{
              start: number;
              end: number;
              formatting: {
                isBold?: boolean;
                isUnderlined?: boolean;
                fontSize?: string;
              }
            }>)
          : [];

        // Convert popup_text_formatting from JSON
        const popupTextFormatting = item.popup_text_formatting 
          ? (item.popup_text_formatting as unknown as {
              isBold?: boolean;
              isUnderlined?: boolean;
              isItalic?: boolean;
              fontSize?: string;
            })
          : undefined;

        // Return a properly typed EncyclopediaEntry
        return {
          id: item.id,
          title: item.title,
          subtext: item.subtext,
          popup_text: item.popup_text || '',
          image_url: item.image_url,
          focal_point_x: item.focal_point_x,
          focal_point_y: item.focal_point_y,
          opacity: item.opacity,
          popup_opacity: item.popup_opacity || item.opacity, // Use opacity as fallback if popup_opacity is null
          title_color: item.title_color,
          subtext_color: item.subtext_color,
          highlight_effect: item.highlight_effect,
          popup_text_formatting: popupTextFormatting,
          formatted_sections: formattedSections
        } as EncyclopediaEntry;
      });
    }
  });

  return {
    entries,
    isLoading,
    error
  };
};
