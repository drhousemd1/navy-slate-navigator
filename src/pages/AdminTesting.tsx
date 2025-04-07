
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import AdminTestingCard from '@/components/admin-testing/AdminTestingCard';
import { AdminTestingCardData, defaultAdminTestingCards } from '@/components/admin-testing/defaultAdminTestingCards';

const AdminTesting = () => {
  const [adminTestingCards, setAdminTestingCards] = useState<AdminTestingCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Constant for localStorage key
  const ADMIN_TESTING_STORAGE_KEY = 'adminTestingCards';

  useEffect(() => {
    // Load cards from localStorage
    const loadCards = () => {
      try {
        setIsLoading(true);
        const savedCards = localStorage.getItem(ADMIN_TESTING_STORAGE_KEY);
        
        if (savedCards) {
          const parsedCards = JSON.parse(savedCards);
          if (Array.isArray(parsedCards) && parsedCards.length > 0) {
            setAdminTestingCards(parsedCards);
            console.log("AdminTesting: Loaded cards from localStorage");
            return;
          }
        }
        
        // If no saved cards, use default cards
        setAdminTestingCards(defaultAdminTestingCards);
        localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(defaultAdminTestingCards));
        console.log("AdminTesting: Initialized with default cards");
      } catch (error) {
        console.error("Error loading admin testing cards:", error);
        setAdminTestingCards(defaultAdminTestingCards);
        toast({
          title: "Error",
          description: "Failed to load cards. Using default cards instead.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadCards();
  }, []);

  const handleUpdateCard = (updatedCard: AdminTestingCardData) => {
    try {
      const updatedCards = adminTestingCards.map(card => 
        card.id === updatedCard.id ? updatedCard : card
      );
      
      setAdminTestingCards(updatedCards);
      localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(updatedCards));
      
      toast({
        title: "Card Updated",
        description: "The admin testing card has been updated successfully",
      });
    } catch (error) {
      console.error("Error updating admin testing card:", error);
      toast({
        title: "Error",
        description: "Failed to update card",
        variant: "destructive"
      });
    }
  };

  const handleAddCard = () => {
    try {
      const newId = `admin-card-${Date.now()}`;
      const newCard: AdminTestingCardData = {
        id: newId,
        title: 'New Test Card',
        description: 'This is a new admin test card'
      };
      
      const updatedCards = [...adminTestingCards, newCard];
      setAdminTestingCards(updatedCards);
      localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(updatedCards));
      
      toast({
        title: "Card Added",
        description: "A new admin testing card has been added",
      });
    } catch (error) {
      console.error("Error adding admin testing card:", error);
      toast({
        title: "Error",
        description: "Failed to add new card",
        variant: "destructive"
      });
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-white mb-6">Admin Testing Panel</h1>
        
        <div className="bg-red-500 text-white p-6 mb-6 rounded-lg">
          <h2 className="text-3xl font-bold">ADMIN TESTING PAGE</h2>
          <p>This page is for testing admin functionality only.</p>
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
            <p className="text-white text-xl">No cards available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {adminTestingCards.map((card, index) => (
              <AdminTestingCard
                key={card.id}
                card={card}
                onUpdate={handleUpdateCard}
                globalCarouselIndex={index}
              />
            ))}
          </div>
        )}
        
        <Separator className="my-6 bg-gray-600" />
        <h2 className="text-xl font-bold text-white mb-6">Additional Test Sections</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-navy p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Test Area 1</h3>
            <p className="text-gray-300">This is a placeholder for additional test functionality.</p>
          </div>
          <div className="bg-navy p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Test Area 2</h3>
            <p className="text-gray-300">This is a placeholder for additional test functionality.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminTesting;
