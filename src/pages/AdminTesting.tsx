
import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import AdminTestingCardEditModal from '@/components/admin-testing/AdminTestingCardEditModal';
import { AdminTestingCardData } from '@/components/admin-testing/AdminTestingCardData';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { renderCardIcon } from '@/components/admin-testing/renderCardIcon';

// Storage key for local data persistence
const ADMIN_TESTING_STORAGE_KEY = 'adminTestingCards';

const AdminTesting = () => {
  const [adminTestingCards, setAdminTestingCards] = useState<AdminTestingCardData[]>([]);
  const [selectedCard, setSelectedCard] = useState<AdminTestingCardData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [carouselTimer, setCarouselTimer] = useState<number>(() => {
    const saved = localStorage.getItem(`${ADMIN_TESTING_STORAGE_KEY}_carouselTimer`);
    return saved ? parseInt(saved) : 5;
  });
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_testing_cards')
          .select('*');
        
        if (error) {
          throw error;
        }
        
        console.log("AdminTesting: Fetched cards from Supabase:", data);
        
        if (data && data.length > 0) {
          setAdminTestingCards(data as AdminTestingCardData[]);
        } else {
          // Load from localStorage as fallback
          const savedCards = localStorage.getItem(ADMIN_TESTING_STORAGE_KEY);
          if (savedCards) {
            setAdminTestingCards(JSON.parse(savedCards));
          }
        }
      } catch (error) {
        console.error("Error fetching admin testing cards:", error);
        toast({
          title: "Error",
          description: "Failed to load cards. Using local data if available.",
          variant: "destructive"
        });
        
        // Attempt to load from localStorage
        const savedCards = localStorage.getItem(ADMIN_TESTING_STORAGE_KEY);
        if (savedCards) {
          setAdminTestingCards(JSON.parse(savedCards));
        }
      }
    };
    
    fetchCards();
  }, [toast]);

  const handleSaveCard = async (updatedCard: AdminTestingCardData) => {
    try {
      console.log("AdminTesting: Saving card", updatedCard);
      
      const { error } = await supabase
        .from('admin_testing_cards')
        .upsert({
          id: updatedCard.id,
          title: updatedCard.title,
          description: updatedCard.description,
          icon_name: updatedCard.iconName,
          icon_url: updatedCard.icon_url,
          icon_color: updatedCard.icon_color,
          title_color: updatedCard.title_color,
          subtext_color: updatedCard.subtext_color,
          calendar_color: updatedCard.calendar_color,
          background_image_url: updatedCard.background_image_url,
          background_images: updatedCard.background_images,
          background_opacity: updatedCard.background_opacity,
          focal_point_x: updatedCard.focal_point_x,
          focal_point_y: updatedCard.focal_point_y,
          highlight_effect: updatedCard.highlight_effect,
          priority: updatedCard.priority,
          usage_data: updatedCard.usage_data
        });
      
      if (error) {
        throw error;
      }
      
      const updatedCards = adminTestingCards.map(card => 
        card.id === updatedCard.id ? updatedCard : card
      );
      
      setAdminTestingCards(updatedCards);
      
      localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(updatedCards));
      
      setIsEditModalOpen(false);
      
      toast({
        title: "Success",
        description: "Card settings saved successfully"
      });
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
      
      const { error } = await supabase
        .from('admin_testing_cards')
        .delete()
        .eq('id', cardId);
      
      if (error) {
        throw error;
      }
      
      const newArr = adminTestingCards.filter(card => card.id !== cardId);
      setAdminTestingCards(newArr);
      
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
      
      setAdminTestingCards(prev => {
        const newArr = [...prev, newCard];
        localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(newArr));
        return newArr;
      });

      toast({
        title: "Card Added",
        description: "A new card has been added successfully",
      });
      
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

  const updateCardUsage = async (card: AdminTestingCardData) => {
    try {
      const dayOfWeek = new Date().getDay();
      
      const usageData = [...(card.usage_data || [0, 0, 0, 0, 0, 0, 0])];
      
      usageData[dayOfWeek] = (usageData[dayOfWeek] || 0) + 1;
      
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
      
      const updatedCards = adminTestingCards.map(c => {
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
    } catch (error) {
      console.error("Error updating card usage:", error);
      toast({
        title: "Error",
        description: "Failed to update card usage",
        variant: "destructive"
      });
    }
  };

  const openCardEdit = (card: AdminTestingCardData) => {
    setSelectedCard(card);
    setIsEditModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-navy p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Admin Testing</h1>
          <Button 
            onClick={handleAddCard}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Card
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminTestingCards.map((card) => (
            <div
              key={card.id}
              onClick={() => openCardEdit(card)}
              className="cursor-pointer bg-dark-navy rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105"
            >
              <div className="p-4">
                <div className="flex items-center space-x-3 mb-2">
                  {renderCardIcon({
                    iconUrl: card.icon_url,
                    iconName: card.iconName,
                    iconColor: card.icon_color
                  })}
                  <h3 className="text-lg font-medium text-white">
                    {card.title}
                  </h3>
                </div>
                <p className="text-gray-400 text-sm">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {selectedCard && (
        <AdminTestingCardEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          cardData={selectedCard}
          onSave={handleSaveCard}
          onDelete={handleDeleteCard}
          localStorageKey={ADMIN_TESTING_STORAGE_KEY}
          carouselTimer={carouselTimer}
          onCarouselTimerChange={(timer) => {
            setCarouselTimer(timer);
            localStorage.setItem(`${ADMIN_TESTING_STORAGE_KEY}_carouselTimer`, String(timer));
          }}
        />
      )}
    </div>
  );
};

export default AdminTesting;

