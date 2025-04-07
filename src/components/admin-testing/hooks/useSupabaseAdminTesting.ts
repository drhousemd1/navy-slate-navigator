
import { useState, useEffect } from 'react';
import { PostgrestResponse } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/* 
1) We removed "ThroneRoomCardData" import and replaced it with a local interface. 
   This interface replicates the structure from AdminTestingCardRow so we don't rely on Throne code.
*/
export interface AdminTestingCardData {
  id: string;
  title: string;
  description: string;
  iconName?: string;
  icon_url?: string;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  background_image_url?: string;
  background_images?: any;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  highlight_effect?: boolean;
  priority?: string;
  usage_data?: number[];
}

/*
2) This interface describes how rows come from the 'admin_testing_cards' table. 
   We'll convert them into AdminTestingCardData in fetchCards().
*/
interface AdminTestingCardRow {
  id: string;
  title: string | null;
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

/*
3) The hook now takes an array of AdminTestingCardData as defaultCards 
   (instead of referencing ThroneRoomCardData).
*/
export const useSupabaseAdminTesting = (defaultCards: AdminTestingCardData[]) => {
  const [adminTestingCards, setAdminTestingCards] = useState<AdminTestingCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // LocalStorage fallback key
  const ADMIN_TESTING_STORAGE_KEY = 'adminTestingCards';

  const fetchCards = async () => {
    try {
      setIsLoading(true);
      console.log("AdminTesting: Fetching cards from Supabase");

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
        // Convert AdminTestingCardRow -> AdminTestingCardData
        const formattedData = data.map((card) => ({
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
          background_opacity: card.background_opacity ?? 100,
          focal_point_x: card.focal_point_x ?? 50,
          focal_point_y: card.focal_point_y ?? 50,
          highlight_effect: card.highlight_effect ?? false,
          priority: card.priority || 'medium',
          usage_data: card.usage_data || [0, 0, 0, 0, 0, 0, 0],
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
        variant: "destructive",
      });

      // fallback to localStorage or default
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

  /* 
  4) A function to insert the defaultCards into the DB if none exist,
     ensuring AdminTesting has something to show. 
     We removed references to ThroneRoom; these are now purely admin testing defaults.
  */
  const initializeDefaultCards = async () => {
    try {
      console.log("AdminTesting: Initializing with default cards");
      const initialCards = defaultCards.map((card) => ({
        id: card.id,
        title: card.title || 'Untitled Card',
        description: card.description || 'No description',
        iconName: card.iconName || '',
        icon_url: card.icon_url || '',
        icon_color: card.icon_color || '#FFFFFF',
        title_color: card.title_color || '#FFFFFF',
        subtext_color: card.subtext_color || '#8E9196',
        calendar_color: card.calendar_color || '#7E69AB',
        background_image_url: card.background_image_url || '',
        background_images: card.background_images || null,
        background_opacity: card.background_opacity ?? 100,
        focal_point_x: card.focal_point_x ?? 50,
        focal_point_y: card.focal_point_y ?? 50,
        highlight_effect: card.highlight_effect ?? false,
        priority: card.priority || 'medium',
        usage_data: card.usage_data || [0, 0, 0, 0, 0, 0, 0],
      })) as AdminTestingCardData[];

      console.log("AdminTesting: Setting initial cards:", initialCards);

      // Save each default card to supabase
      for (const card of initialCards) {
        const { error } = await supabase.from('admin_testing_cards').insert([{
          id: card.id,
          title: card.title,
          description: card.description,
          icon_name: card.iconName,
          icon_url: card.icon_url || null,
          icon_color: card.icon_color,
          title_color: card.title_color,
          subtext_color: card.subtext_color,
          calendar_color: card.calendar_color,
          background_image_url: card.background_image_url || null,
          background_images: card.background_images,
          background_opacity: card.background_opacity,
          focal_point_x: card.focal_point_x,
          focal_point_y: card.focal_point_y,
          highlight_effect: card.highlight_effect,
          priority: card.priority,
          usage_data: card.usage_data,
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
        variant: "destructive",
      });
    }
  };

  /*
  5) Save card updates to supabase and local state. 
     We explicitly avoid referencing ThroneRoom here. 
  */
  const saveCard = async (updatedData: AdminTestingCardData) => {
    try {
      console.log("AdminTesting: Saving card", updatedData);

      // Basic validation
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

      // Data prepared for supabase
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
        background_opacity: updatedData.background_opacity ?? 100,
        focal_point_x: updatedData.focal_point_x ?? 50,
        focal_point_y: updatedData.focal_point_y ?? 50,
        highlight_effect: updatedData.highlight_effect ?? false,
        priority: updatedData.priority || 'medium',
        usage_data: updatedData.usage_data || [0, 0, 0, 0, 0, 0, 0],
        updated_at: new Date().toISOString(),
      };

      console.log("Sending data to Supabase:", dataForSupabase);

      // Upsert to supabase
      const { error } = await supabase
        .from('admin_testing_cards')
        .upsert(dataForSupabase);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      // Update local state
      const newCards = [...adminTestingCards];
      const index = newCards.findIndex((c) => c.id === updatedData.id);
      if (index >= 0) {
        newCards[index] = updatedData;
      } else {
        newCards.push(updatedData);
      }
      setAdminTestingCards(newCards);

      // Also update localStorage
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
        variant: "destructive",
      });
      return false;
    }
  };

  /*
  6) Delete a card by ID from supabase and local state.
  */
  const deleteCard = async (cardId: string) => {
    try {
      console.log("AdminTesting: Deleting card", cardId);

      // Remove from supabase
      const { error } = await supabase
        .from('admin_testing_cards')
        .delete()
        .eq('id', cardId);

      if (error) {
        throw error;
      }

      // Update local state
      const newArr = adminTestingCards.filter((card) => card.id !== cardId);
      setAdminTestingCards(newArr);

      // Also update fallback
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
        variant: "destructive",
      });
      return false;
    }
  };

  /*
  7) Add a brand-new card. 
     Now using a string-based ID generation that doesn't rely on UUID format.
  */
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
        usage_data: [0, 0, 0, 0, 0, 0, 0],
      };

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
          usage_data: newCard.usage_data,
        }]);

      if (error) {
        throw error;
      }

      // Update local state
      setAdminTestingCards((prev) => {
        const newArr = [...prev, newCard];
        localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(newArr));
        return newArr;
      });

      toast({
        title: "Card Added",
        description: "A new admin testing card has been added successfully",
      });

      return newCard;
    } catch (error) {
      console.error("Error adding admin testing card:", error);
      toast({
        title: "Error",
        description: `Failed to add card: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      return null;
    }
  };

  /*
  8) Update usage stats. e.g. increment usage_data for dayOfWeek. 
  */
  const updateCardUsage = async (card: AdminTestingCardData) => {
    try {
      const dayOfWeek = new Date().getDay();
      const usageData = [...(card.usage_data || [0, 0, 0, 0, 0, 0, 0])];
      usageData[dayOfWeek] = (usageData[dayOfWeek] || 0) + 1;

      console.log("Updating usage for card:", card.id, "New usage data:", usageData);

      const { error } = await supabase
        .from('admin_testing_cards')
        .update({
          usage_data: usageData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', card.id);

      if (error) {
        console.error("Error in Supabase update:", error);
        throw error;
      }

      const updatedCards = adminTestingCards.map((c) => {
        if (c.id === card.id) {
          return { ...c, usage_data: usageData };
        }
        return c;
      });

      setAdminTestingCards(updatedCards);
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
        variant: "destructive",
      });
      return false;
    }
  };

  /*
  9) Optional: Realtime subscription if you want dynamic updates
  */
  const setupRealtimeSubscription = () => {
    console.log("Setting up realtime subscription for admin_testing_cards");
    const channel = supabase
      .channel('admin-testing-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_testing_cards' },
        (payload) => {
          console.log("Realtime update received:", payload);
          fetchCards(); // Re-fetch cards on changes
        }
      )
      .subscribe();

    return () => {
      console.log("Cleaning up realtime subscription");
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    fetchCards();
    // Optionally, set up realtime if needed
    // const cleanup = setupRealtimeSubscription();
    // return cleanup;
  }, []);

  return {
    adminTestingCards,
    isLoading,
    fetchCards,
    saveCard,
    deleteCard,
    addCard,
    updateCardUsage,
    setupRealtimeSubscription,
  };
};
