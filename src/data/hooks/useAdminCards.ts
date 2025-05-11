
/**
 * CENTRALIZED DATA LOGIC – DO NOT MODIFY OUTSIDE THIS FOLDER.
 * This hook manages fetching, caching, and syncing admin testing cards.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { loadAdminCardsFromDB, saveAdminCardsToDB } from '@/data/indexedDB/useIndexedDB';
import { AdminTestingCardData } from '@/components/admin-testing/defaultAdminTestingCards';
import { toast } from "@/hooks/use-toast";
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { logQueryPerformance } from '@/lib/react-query-config';
import { syncCardById } from '@/data/sync/useSyncManager';

// Type for SupabaseCardData
interface SupabaseCardData {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  points: number | null;
  background_image_url: string | null;
  background_images: any;
  background_opacity: number | null;
  focal_point_x: number | null;
  focal_point_y: number | null;
  title_color: string | null;
  subtext_color: string | null;
  calendar_color: string | null;
  icon_url: string | null;
  icon_name: string | null;
  icon_color: string | null;
  highlight_effect: boolean | null;
  usage_data: any;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
}

// Default admin card
const DEFAULT_ADMIN_CARD: AdminTestingCardData = {
  id: '',
  title: 'New Card',
  description: 'This is a new admin testing card.',
  priority: 'medium',
  points: 5,
  background_opacity: 80,
  focal_point_x: 50,
  focal_point_y: 50,
  title_color: '#FFFFFF',
  subtext_color: '#8E9196',
  calendar_color: '#7E69AB',
  icon_color: '#FFFFFF',
  highlight_effect: false,
  usage_data: [0, 0, 0, 0, 0, 0, 0],
  background_images: []
};

// Fetch admin cards from Supabase
const fetchAdminCards = async (): Promise<AdminTestingCardData[]> => {
  const startTime = performance.now();
  
  try {
    const { data, error } = await supabase
      .from('admin_testing_cards')
      .select('*');
    
    if (error) {
      console.error('Error fetching admin cards from Supabase:', error);
      throw new Error(`Failed to fetch admin cards: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      return [];
    }

    const formattedCards = data.map((card: SupabaseCardData) => ({
      ...card,
      priority: (card.priority as 'low' | 'medium' | 'high') || 'medium',
      points: typeof card.points === 'number' ? card.points : 5,
      background_opacity: card.background_opacity || 80,
      focal_point_x: card.focal_point_x || 50,
      focal_point_y: card.focal_point_y || 50,
      title_color: card.title_color || '#FFFFFF',
      subtext_color: card.subtext_color || '#8E9196',
      calendar_color: card.calendar_color || '#7E69AB',
      icon_color: card.icon_color || '#FFFFFF',
      highlight_effect: card.highlight_effect || false,
      usage_data: card.usage_data || [0, 0, 0, 0, 0, 0, 0],
      background_images: Array.isArray(card.background_images) ? card.background_images : []
    })) as AdminTestingCardData[];
    
    logQueryPerformance('fetchAdminCards', startTime, formattedCards.length);
    return formattedCards;
  } catch (error) {
    console.error('Error in fetchAdminCards:', error);
    throw error;
  }
};

// Create a new admin card in Supabase
const createAdminCard = async (newCard: AdminTestingCardData): Promise<AdminTestingCardData> => {
  const { data, error } = await supabase
    .from('admin_testing_cards')
    .insert({
      ...newCard,
      points: newCard.points || 0
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding admin card to Supabase:', error);
    throw new Error(`Failed to add card: ${error.message}`);
  }
  
  const supabaseData = data as SupabaseCardData;
  const formattedCard = {
    ...data,
    priority: (supabaseData.priority as 'low' | 'medium' | 'high') || 'medium',
    points: typeof supabaseData.points === 'number' ? supabaseData.points : 5,
    background_images: Array.isArray(supabaseData.background_images) ? supabaseData.background_images : []
  } as AdminTestingCardData;
  
  return formattedCard;
};

// Update an existing admin card in Supabase
const updateAdminCard = async (updatedCard: AdminTestingCardData): Promise<AdminTestingCardData> => {
  const { error } = await supabase
    .from('admin_testing_cards')
    .upsert({
      ...updatedCard,
      points: typeof updatedCard.points === 'number' ? updatedCard.points : 0
    }, { 
      onConflict: 'id',
      ignoreDuplicates: false 
    });
  
  if (error) {
    console.error('Error updating admin card in Supabase:', error);
    throw new Error(`Failed to update card: ${error.message}`);
  }
  
  return updatedCard;
};

// Delete an admin card from Supabase
const deleteAdminCard = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('admin_testing_cards')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting admin card from Supabase:', error);
    throw new Error(`Failed to delete card: ${error.message}`);
  }
};

/**
 * Hook for managing admin cards
 */
export function useAdminCards() {
  const queryClient = useQueryClient();
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  
  // Load admin cards with IndexedDB caching
  const { 
    data: adminCards = [], 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['adminCards'],
    queryFn: async () => {
      try {
        // First try to get from IndexedDB
        const cachedCards = await loadAdminCardsFromDB();
        
        if (cachedCards && cachedCards.length > 0) {
          console.log('Found cached admin cards in IndexedDB:', cachedCards.length);
          
          // Update the cache in the background
          fetchAdminCards()
            .then(latestCards => {
              saveAdminCardsToDB(latestCards);
              queryClient.setQueryData(['adminCards'], latestCards);
            })
            .catch(error => {
              console.error('Error updating cached admin cards:', error);
            });
          
          return cachedCards;
        }
        
        // If no cache, fetch from Supabase
        console.log('No cached admin cards found, fetching from Supabase');
        const cards = await fetchAdminCards();
        
        // Save to IndexedDB
        if (cards.length > 0) {
          await saveAdminCardsToDB(cards);
        }
        
        return cards;
      } catch (error) {
        console.error('Error in admin cards query:', error);
        throw error;
      }
    },
    ...STANDARD_QUERY_CONFIG
  });

  // Add a new admin card
  const { mutateAsync: addAdminCard } = useMutation({
    mutationFn: async () => {
      try {
        setIsCreatingCard(true);
        const newCard: AdminTestingCardData = {
          ...DEFAULT_ADMIN_CARD,
          id: uuidv4()
        };
        
        const createdCard = await createAdminCard(newCard);
        
        // Update local cache
        queryClient.setQueryData(['adminCards'], (oldCards = []) => [...oldCards, createdCard]);
        
        // Update IndexedDB
        const updatedCards = [...adminCards, createdCard];
        await saveAdminCardsToDB(updatedCards);
        
        toast({
          title: "Success",
          description: "New card created successfully",
        });
        
        return createdCard;
      } catch (error) {
        console.error('Error in addAdminCard:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred while adding the card",
          variant: "destructive"
        });
        throw error;
      } finally {
        setIsCreatingCard(false);
      }
    }
  });

  // Update an admin card
  const { mutateAsync: updateCard } = useMutation({
    mutationFn: async (updatedCard: AdminTestingCardData) => {
      try {
        // Optimistically update UI
        queryClient.setQueryData(['adminCards'], (oldCards: AdminTestingCardData[] = []) => 
          oldCards.map(card => card.id === updatedCard.id ? updatedCard : card)
        );
        
        // Save to Supabase
        await updateAdminCard(updatedCard);
        
        // Update IndexedDB
        const updatedCards = adminCards.map(card => 
          card.id === updatedCard.id ? updatedCard : card
        );
        await saveAdminCardsToDB(updatedCards);
        
        toast({
          title: "Success",
          description: "Card saved successfully",
        });
        
        return updatedCard;
      } catch (error) {
        console.error('Error updating admin card:', error);
        toast({
          title: "Error",
          description: `Failed to save card: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
        
        // Revert optimistic update on error
        refetch();
        throw error;
      }
    }
  });

  // Delete an admin card
  const { mutateAsync: deleteCard } = useMutation({
    mutationFn: async (cardId: string) => {
      try {
        // Optimistically update UI
        queryClient.setQueryData(['adminCards'], (oldCards: AdminTestingCardData[] = []) => 
          oldCards.filter(card => card.id !== cardId)
        );
        
        // Delete from Supabase
        await deleteAdminCard(cardId);
        
        // Update IndexedDB
        const updatedCards = adminCards.filter(card => card.id !== cardId);
        await saveAdminCardsToDB(updatedCards);
        
        toast({
          title: "Card Deleted",
          description: "The admin testing card has been deleted",
        });
      } catch (error) {
        console.error('Error deleting admin card:', error);
        toast({
          title: "Error",
          description: "Failed to delete card",
          variant: "destructive"
        });
        
        // Revert optimistic update on error
        refetch();
        throw error;
      }
    }
  });

  // Sync a specific card with Supabase
  const syncCard = useCallback(async (cardId: string) => {
    try {
      await syncCardById(cardId, 'admin_testing_cards');
      refetch();
    } catch (error) {
      console.error('Error syncing admin card:', error);
    }
  }, [refetch]);

  return {
    adminCards,
    isLoading,
    isCreatingCard,
    error,
    refetch,
    addAdminCard,
    updateCard,
    deleteCard,
    syncCard
  };
}

// Export individual functions for direct usage (when hook context is not available)
export const adminCardActions = {
  fetchAdminCards,
  createAdminCard,
  updateAdminCard,
  deleteAdminCard
};
