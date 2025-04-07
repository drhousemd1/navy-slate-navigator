
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus } from 'lucide-react';
import AdminTestingCard, { AdminTestingCardData } from '@/components/admin-testing/AdminTestingCard';

const AdminTesting = () => {
  const [adminTestingCards, setAdminTestingCards] = useState<AdminTestingCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const ADMIN_TESTING_STORAGE_KEY = 'adminTestingCards';

  useEffect(() => {
    console.log("AdminTesting: Component mounted");
    
    toast({
      title: "Admin Testing Page",
      description: "Admin testing page has been loaded",
    });
    
    // Load cards from localStorage
    const loadCards = () => {
      const saved = localStorage.getItem(ADMIN_TESTING_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setAdminTestingCards(parsed);
          } else {
            // If it's a single object, convert to array
            setAdminTestingCards([parsed]);
          }
        } catch (error) {
          console.error("Error parsing stored cards:", error);
          setAdminTestingCards([]);
        }
      }
      setIsLoading(false);
    };
    
    loadCards();
  }, []);

  const handleAddCard = () => {
    const newId = `card-${Date.now()}`;
    const newCard: AdminTestingCardData = {
      id: newId,
      title: 'New Card',
      description: 'This is a new card description',
      icon_color: '#FFFFFF',
      title_color: '#FFFFFF',
      subtext_color: '#8E9196',
      calendar_color: '#7E69AB',
      highlight_effect: false,
      priority: 'medium',
      carousel_interval: 5000,
      background_images: [null, null, null, null, null]
    };

    setAdminTestingCards(prev => {
      const newCards = [...prev, newCard];
      localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(newCards));
      return newCards;
    });

    toast({
      title: "Card Added",
      description: "A new card has been added successfully",
    });
  };

  const handleSaveCard = (updatedCard: AdminTestingCardData) => {
    setAdminTestingCards(prev => {
      const index = prev.findIndex(card => card.id === updatedCard.id);
      if (index >= 0) {
        const newCards = [...prev];
        newCards[index] = updatedCard;
        localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(newCards));
        return newCards;
      }
      return prev;
    });
    
    toast({
      title: "Card Updated",
      description: "The card has been updated successfully",
    });
  };

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
            <Plus className="mr-2 h-4 w-4" />
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
            <p className="text-white text-xl">No cards available. Add a new card to get started.</p>
            <Button 
              className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-md"
              onClick={handleAddCard}
            >
              Add New Card
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {adminTestingCards.map((card) => (
              <AdminTestingCard 
                key={card.id}
                card={card}
                onSave={handleSaveCard}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminTesting;
