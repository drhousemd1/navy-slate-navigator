
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { ThroneRoomCardData } from '@/components/throne/ThroneRoomEditModal';
import { defaultThroneRoomCards } from '@/components/throne/defaultThroneRoomCards';
import { renderCardIcon } from '@/components/throne/utils/renderCardIcon';
import CardHeader from '@/components/throne/card/CardHeader';
import CardContent from '@/components/throne/card/CardContent';
import CardFooter from '@/components/throne/card/CardFooter';
import { toast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import AdminTestingCardEditModal from '@/components/admin-testing/AdminTestingCardEditModal';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { PostgrestResponse } from '@supabase/supabase-js';

// Define a type specifically for the admin testing cards
interface AdminTestingCardData extends ThroneRoomCardData {
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

const AdminTesting = () => {
  const [adminTestingCards, setAdminTestingCards] = useState<AdminTestingCardData[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<AdminTestingCardData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [carouselTimer, setCarouselTimer] = useState(5);
  
  // Constant for localStorage key as fallback and for carousel timer
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

  useEffect(() => {
    console.log("AdminTesting: Component mounted");
    
    toast({
      title: "Admin Testing Page",
      description: "Admin testing page has been loaded",
    });
    
    // Load carousel timer from localStorage
    const storedTimer = parseInt(localStorage.getItem(`${ADMIN_TESTING_STORAGE_KEY}_carouselTimer`) || '5', 10);
    if (!isNaN(storedTimer)) {
      setCarouselTimer(storedTimer);
    }
    
    fetchCards();
    
    // Set up realtime subscription
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
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    
    localStorage.setItem(`${ADMIN_TESTING_STORAGE_KEY}_carouselTimer`, carouselTimer.toString());
    
    const interval = setInterval(() => {
      setCarouselIndex((prev) => {
        // Only rotate if there are multiple cards
        if (adminTestingCards.length <= 1) return prev;
        return (prev + 1) % adminTestingCards.length;
      });
    }, carouselTimer * 1000);
    
    return () => clearInterval(interval);
  }, [isLoading, carouselTimer, adminTestingCards.length]);

  const initializeDefaultCards = async () => {
    try {
      console.log("AdminTesting: Initializing with default cards");
      const initialCards = defaultThroneRoomCards.map(card => ({
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

  const handleSaveCard = async (updatedData: AdminTestingCardData) => {
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
      const index = adminTestingCards.findIndex(c => c.id === updatedData.id);
      if (index >= 0) {
        const newArr = [...adminTestingCards];
        newArr[index] = updatedData;
        setAdminTestingCards(newArr);
        // Also update localStorage as fallback
        localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(newArr));
      }
      
      toast({
        title: "Card Updated",
        description: "The admin testing card has been updated successfully",
      });
      
      // Close the edit modal after saving
      setIsEditModalOpen(false);
      setSelectedCard(null);
    } catch (error) {
      console.error("Error saving admin testing card:", error);
      toast({
        title: "Error",
        description: `Failed to save card: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteCard = async (cardId: string) => {
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
      
      // Update local state only when no realtime subscription
      const newArr = adminTestingCards.filter(card => card.id !== cardId);
      setAdminTestingCards(newArr);
      
      // Also update localStorage as fallback
      localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(newArr));
      
      setIsEditModalOpen(false);
      
      toast({
        title: "Card Deleted",
        description: "The admin testing card has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting admin testing card:", error);
      toast({
        title: "Error",
        description: `Failed to delete card: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleAddCard = async () => {
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
      
      // Select and open the edit modal for the new card
      setSelectedCard(newCard);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error("Error adding admin testing card:", error);
      toast({
        title: "Error",
        description: `Failed to add card: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  // Update card usage data
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
    } catch (error) {
      console.error("Error updating card usage:", error);
      toast({
        title: "Error",
        description: "Failed to update card usage",
        variant: "destructive"
      });
    }
  };

  console.log("AdminTesting: Rendering with cards:", adminTestingCards);

  return (
    <AppLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-white mb-6">TESTING PAGE - ADMIN TESTING PANEL</h1>
        
        <div className="bg-red-500 text-white p-6 mb-6 rounded-lg">
          <h2 className="text-3xl font-bold">THIS IS THE ADMIN TESTING PAGE</h2>
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Admin Testing Cards</h2>
          <Button 
            className="bg-green-500 hover:bg-green-600 text-white"
            onClick={handleAddCard}
          >
            Add Card
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64 bg-navy rounded-lg">
            <Loader2 className="h-8 w-8 text-white animate-spin mr-2" />
            <p className="text-white text-xl">Loading admin testing cards...</p>
          </div>
        ) : adminTestingCards.length === 0 ? (
          <div className="flex items-center justify-center h-64 bg-navy rounded-lg">
            <p className="text-white text-xl">No cards available. Please initialize default cards.</p>
            <button 
              className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-md"
              onClick={initializeDefaultCards}
            >
              Load Default Cards
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {adminTestingCards.map((card) => {
              const IconComponent = defaultThroneRoomCards.find(defaultCard => defaultCard.id === card.id)?.icon;
              
              return (
                <Card 
                  key={card.id} 
                  className="relative overflow-hidden border-2 border-[#00f0ff] bg-navy cursor-pointer"
                  onClick={() => updateCardUsage(card)}
                >
                  <div className="relative z-20 flex flex-col p-4 md:p-6 h-full">
                    <CardHeader 
                      priority={card.priority || 'medium'}
                      points={5}
                    />
                    
                    <CardContent 
                      title={card.title || 'Untitled Card'}
                      description={card.description || 'No description'}
                      iconComponent={
                        renderCardIcon({
                          iconUrl: card.icon_url,
                          iconName: card.iconName,
                          iconColor: card.icon_color,
                          fallbackIcon: IconComponent ? <IconComponent className="text-white w-6 h-6" /> : undefined
                        })
                      }
                      titleColor={card.title_color || '#FFFFFF'}
                      subtextColor={card.subtext_color || '#8E9196'}
                      highlightEffect={card.highlight_effect || false}
                    />
                    
                    <CardFooter 
                      calendarColor={card.calendar_color || '#7E69AB'}
                      usageData={card.usage_data || [0, 0, 0, 0, 0, 0, 0]}
                      onEditClick={() => {
                        console.log("Setting selected card:", card);
                        setSelectedCard({...card}); // Create a copy to avoid reference issues
                        setIsEditModalOpen(true);
                      }}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        
        <Separator className="my-6 bg-gray-600" />
        <h2 className="text-xl font-bold text-white mb-6">Section 2</h2>
        
        <Separator className="my-6 bg-gray-600" />
        <h2 className="text-xl font-bold text-white mb-6">Section 3</h2>
      </div>
      
      {selectedCard && (
        <AdminTestingCardEditModal
          isOpen={isEditModalOpen}
          cardData={selectedCard}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedCard(null);
          }}
          onSave={handleSaveCard}
          onDelete={handleDeleteCard}
          localStorageKey={ADMIN_TESTING_STORAGE_KEY}
          carouselTimer={carouselTimer}
          onCarouselTimerChange={setCarouselTimer}
        />
      )}
    </AppLayout>
  );
};

export default AdminTesting;
