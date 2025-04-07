
import { useState, useEffect } from 'react';
import { PostgrestResponse } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ThroneRoomCardData } from '@/components/throne/ThroneRoomEditModal';

// Define a type specifically for the admin testing cards
export interface AdminTestingCardData extends ThroneRoomCardData {
  // Additional fields specific to admin testing cards can be added here
}

// Define the structure of the data returned from Supabase
interface AdminTestingCardRow {
  id: string;
  title: string;
  description: string | null;
  icon_name: string | null;
  icon_url: string | null;
  icon_color: string | null;
  title_color: string | null;
  subtext_color: string | null;
  calendar_color: string | null;
  background_image_url: string | null;
  background_images: any | null;
  background_opacity: number | null;
  focal_point_x: number | null;
  focal_point_y: number | null;
  highlight_effect: boolean | null;
  priority: string | null;
  usage_data: number[] | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
}

export const useSupabaseAdminTesting = (defaultCards: ThroneRoomCardData[]) => {
  const [adminTestingCards, setAdminTestingCards] = useState<AdminTestingCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Constant for localStorage key as fallback
  const ADMIN_TESTING_STORAGE_KEY = 'adminTestingCards';

  const fetchCards = async () => {
    try {
      setIsLoading(true);
      console.log("AdminTesting: Fetching cards from Supabase");
      
      // Using the any type to avoid TypeScript errors
      const { data, error }: PostgrestResponse<AdminTestingCardRow> = await supabase
        .from('admin_testing_cards')
        .select('*')
        .order('created_at', { ascending: false }) as PostgrestResponse<AdminTestingCardRow>;
      
      if (error) {
        console.error("Error fetching admin testing cards:", error);
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log("AdminTesting: Loaded cards from Supabase:", data);
        // Transform the data to ensure it matches our expected format
        const formattedData = data.map(card => ({
          id: card.id,
          title: card.title || 'Untitled Card',
          description: card.description || 'No description',
          iconName: card.icon_name || '',
          icon_url: card.icon_url || undefined,
          icon_color: card.icon_color || '#FFFFFF',
          title_color: card.title_color || '#FFFFFF',
          subtext_color: card.subtext_color || '#8E9196',
          calendar_color: card.calendar_color || '#7E69AB',
          background_image_url: card.background_image_url || undefined,
          background_images: card.background_images || undefined,
          background_opacity: card.background_opacity || 100,
          focal_point_x: card.focal_point_x || 50,
          focal_point_y: card.focal_point_y || 50,
          highlight_effect: card.highlight_effect || false,
          priority: card.priority || 'medium',
          usage_data: card.usage_data || [0, 0, 0, 0, 0, 0, 0]
        })) as AdminTestingCardData[];
        
        setAdminTestingCards(formattedData);
      } else {
        console.log("AdminTesting: No cards found in Supabase, initializing with defaults");
        initializeDefaultCards();
      }
    } catch (error) {
      console.error("Error fetching admin testing cards:", error);
      toast({
        title: "Error",
        description: "Failed to load cards. Loading default cards instead.",
        variant: "destructive"
      });
      
      // Try to load from localStorage as fallback
      const saved = localStorage.getItem(ADMIN_TESTING_STORAGE_KEY);
      if (saved) {
        try {
          const parsedCards = JSON.parse(saved);
          if (Array.isArray(parsedCards) && parsedCards.length > 0) {
            setAdminTestingCards(parsedCards);
          } else {
            initializeDefaultCards();
          }
        } catch (err) {
          initializeDefaultCards();
        }
      } else {
        initializeDefaultCards();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const initializeDefaultCards = async () => {
    try {
      console.log("AdminTesting: Initializing with default cards");
      const initialCards = defaultCards.map(card => ({
        id: card.id,
        title: card.title || 'Untitled Card',
        description: card.description || 'No description',
        iconName: '',
        icon_color: '#FFFFFF',
        title_color: '#FFFFFF',
        subtext_color: '#8E9196',
        calendar_color: '#7E69AB',
        highlight_effect: false,
        priority: card.priority || 'medium',
        usage_data: [0, 0, 0, 0, 0, 0, 0]
      })) as AdminTestingCardData[];
      
      console.log("AdminTesting: Setting initial cards:", initialCards);
      
      // Save to Supabase
      for (const card of initialCards) {
        const { error } = await supabase
          .from('admin_testing_cards')
          .insert([{
            id: card.id,
            title: card.title,
            description: card.description,
            icon_name: card.iconName,
            icon_color: card.icon_color,
            title_color: card.title_color,
            subtext_color: card.subtext_color,
            calendar_color: card.calendar_color,
            highlight_effect: card.highlight_effect,
            priority: card.priority,
            usage_data: card.usage_data
          }]);
          
        if (error) {
          console.error("Error inserting default card:", error);
        }
      }
      
      // Also save to localStorage as fallback
      localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(initialCards));
      
      setAdminTestingCards(initialCards);
    } catch (error) {
      console.error("AdminTesting: Error initializing default cards:", error);
      toast({
        title: "Error",
        description: "Failed to initialize default cards.",
        variant: "destructive"
      });
    }
  };

  const saveCard = async (updatedData: AdminTestingCardData) => {
    try {
      console.log("AdminTesting: Saving card", updatedData);
      
      // Ensure we have the required fields
      if (!updatedData.title) {
        throw new Error("Card title is required");
      }
      
      // Ensure icon fields are properly formatted
      const iconName = updatedData.iconName || null;
      const iconUrl = updatedData.icon_url || null;
      
      // Ensure background image fields are properly formatted
      let backgroundImageUrl = updatedData.background_image_url || null;
      let backgroundImages = updatedData.background_images || null;
      
      console.log("Background image URL:", backgroundImageUrl);
      console.log("Background images array:", backgroundImages);
      
      // Prepare data for Supabase with proper types
      const dataForSupabase = {
        id: updatedData.id,
        title: updatedData.title,
        description: updatedData.description,
        icon_name: iconName,
        icon_url: iconUrl,
        icon_color: updatedData.icon_color,
        title_color: updatedData.title_color,
        subtext_color: updatedData.subtext_color,
        calendar_color: updatedData.calendar_color,
        background_image_url: backgroundImageUrl,
        background_images: backgroundImages,
        background_opacity: updatedData.background_opacity || 100,
        focal_point_x: updatedData.focal_point_x || 50,
        focal_point_y: updatedData.focal_point_y || 50,
        highlight_effect: updatedData.highlight_effect || false,
        priority: updatedData.priority || 'medium',
        usage_data: updatedData.usage_data || [0, 0, 0, 0, 0, 0, 0],
        updated_at: new Date().toISOString()
      };
      
      console.log("Sending data to Supabase:", dataForSupabase);
      
      // Update in Supabase
      const { error } = await supabase
        .from('admin_testing_cards')
        .upsert(dataForSupabase);
      
      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      
      // Update local state only when no realtime subscription
      const newCards = [...adminTestingCards];
      const index = newCards.findIndex(c => c.id === updatedData.id);
      if (index >= 0) {
        newCards[index] = updatedData;
      } else {
        newCards.push(updatedData);
      }
      setAdminTestingCards(newCards);
      
      // Also update localStorage as fallback
      localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(newCards));
      
      toast({
        title: "Card Updated",
        description: "The admin testing card has been updated successfully",
      });
      
      return true;
    } catch (error) {
      console.error("Error saving admin testing card:", error);
      toast({
        title: "Error",
        description: `Failed to save card: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      return false;
    }
  };
  
  const deleteCard = async (cardId: string) => {
    try {
      console.log("AdminTesting: Deleting card", cardId);
      
      // Delete from Supabase
      const { error } = await supabase
        .from('admin_testing_cards')
        .delete()
        .eq('id', cardId);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      const newArr = adminTestingCards.filter(card => card.id !== cardId);
      setAdminTestingCards(newArr);
      
      // Also update localStorage as fallback
      localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(newArr));
      
      toast({
        title: "Card Deleted",
        description: "The admin testing card has been deleted successfully",
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting admin testing card:", error);
      toast({
        title: "Error",
        description: `Failed to delete card: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      return false;
    }
  };

  const addCard = async () => {
    try {
      const newId = `card-${Date.now()}`;
      const newCard: AdminTestingCardData = {
        id: newId,
        title: 'New Card',
        description: 'This is a new card description',
        iconName: '',
        icon_color: '#FFFFFF',
        title_color: '#FFFFFF',
        subtext_color: '#8E9196',
        calendar_color: '#7E69AB',
        highlight_effect: false,
        priority: 'medium',
        usage_data: [0, 0, 0, 0, 0, 0, 0]
      };

      // Insert into Supabase
      const { error } = await supabase
        .from('admin_testing_cards')
        .insert([{
          id: newCard.id,
          title: newCard.title,
          description: newCard.description,
          icon_name: newCard.iconName,
          icon_color: newCard.icon_color,
          title_color: newCard.title_color,
          subtext_color: newCard.subtext_color,
          calendar_color: newCard.calendar_color,
          highlight_effect: newCard.highlight_effect,
          priority: newCard.priority,
          usage_data: newCard.usage_data
        }]);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setAdminTestingCards(prev => {
        const newArr = [...prev, newCard];
        // Also update localStorage as fallback
        localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(newArr));
        return newArr;
      });

      toast({
        title: "Card Added",
        description: "A new card has been added successfully",
      });
      
      return newCard;
    } catch (error) {
      console.error("Error adding admin testing card:", error);
      toast({
        title: "Error",
        description: `Failed to add card: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      return null;
    }
  };

  const updateCardUsage = async (card: AdminTestingCardData) => {
    try {
      // Get current day of week (0-6, where 0 is Sunday)
      const dayOfWeek = new Date().getDay();
      
      // Create a copy of the current usage data or initialize if not present
      const usageData = [...(card.usage_data || [0, 0, 0, 0, 0, 0, 0])];
      
      // Increment the count for today
      usageData[dayOfWeek] = (usageData[dayOfWeek] || 0) + 1;
      
      // Update in Supabase
      const { error } = await supabase
        .from('admin_testing_cards')
        .update({ 
          usage_data: usageData,
          updated_at: new Date().toISOString()
        })
        .eq('id', card.id);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      const updatedCards = adminTestingCards.map(c => {
        if (c.id === card.id) {
          return { ...c, usage_data: usageData };
        }
        return c;
      });
      
      setAdminTestingCards(updatedCards);
      
      // Also update localStorage as fallback
      localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(updatedCards));
      
      toast({
        title: "Usage Recorded",
        description: "Card usage has been recorded for today",
      });
      
      return true;
    } catch (error) {
      console.error("Error updating card usage:", error);
      toast({
        title: "Error",
        description: "Failed to update card usage",
        variant: "destructive"
      });
      return false;
    }
  };

  const setupRealtimeSubscription = () => {
    console.log("Setting up realtime subscription for admin_testing_cards");
    const channel = supabase
      .channel('admin-testing-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'admin_testing_cards' 
        }, 
        (payload) => {
          console.log("Realtime update received:", payload);
          fetchCards(); // Refetch cards when changes occur
        }
      )
      .subscribe();
    
    return () => {
      console.log("Cleaning up realtime subscription");
      supabase.removeChannel(channel);
    };
  };

  return {
    adminTestingCards,
    isLoading,
    fetchCards,
    saveCard,
    deleteCard,
    addCard,
    updateCardUsage,
    setupRealtimeSubscription
  };
};
