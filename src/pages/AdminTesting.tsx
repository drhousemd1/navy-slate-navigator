import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import AdminTestingCard from '@/components/admin-testing/AdminTestingCard';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AdminTestingCardData } from '@/components/admin-testing/defaultAdminTestingCards';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";

const AdminTesting = () => {
  const [cards, setCards] = useState<AdminTestingCardData[]>([]);
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);
  const [carouselTimer, setCarouselTimer] = useState(5);
  const [isLoading, setIsLoading] = useState(true);

  // Load cards from Supabase and carousel timer from localStorage
  useEffect(() => {
    const fetchCards = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('admin_testing_cards')
          .select('*');
        
        if (error) {
          console.error('Error fetching cards from Supabase:', error);
          toast({
            title: "Error",
            description: `Failed to load cards: ${error.message}`,
            variant: "destructive"
          });
          return;
        }
        
        // Only use data from Supabase if we got results
        if (data && data.length > 0) {
          // Convert data to the expected format
          const formattedCards = data.map(card => ({
            ...card,
            priority: (card.priority as 'low' | 'medium' | 'high') || 'medium',
            points: card.points || 5,
            background_opacity: card.background_opacity || 80,
            focal_point_x: card.focal_point_x || 50,
            focal_point_y: card.focal_point_y || 50,
            title_color: card.title_color || '#FFFFFF',
            subtext_color: card.subtext_color || '#8E9196',
            calendar_color: card.calendar_color || '#7E69AB',
            icon_color: card.icon_color || '#FFFFFF',
            highlight_effect: card.highlight_effect || false,
            usage_data: card.usage_data || [0, 0, 0, 0, 0, 0, 0]
          })) as AdminTestingCardData[];
          
          setCards(formattedCards);
        }
      } catch (error) {
        console.error('Error in fetchCards:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCards();
    
    // Load carousel timer from localStorage (keeping this in localStorage as it's a global setting)
    const savedTimer = parseInt(localStorage.getItem('adminTestingCards_carouselTimer') || '5', 10);
    setCarouselTimer(savedTimer);
    
    // Start the carousel interval
    const intervalId = setInterval(() => {
      setGlobalCarouselIndex(prev => prev + 1);
    }, savedTimer * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Add a new card
  const handleAddCard = async () => {
    const newCard: AdminTestingCardData = {
      id: uuidv4(),
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
      usage_data: [0, 0, 0, 0, 0, 0, 0]
    };
    
    try {
      // Insert the new card into Supabase
      const { data, error } = await supabase
        .from('admin_testing_cards')
        .insert(newCard)
        .select()
        .single();
      
      if (error) {
        console.error('Error adding card to Supabase:', error);
        toast({
          title: "Error",
          description: `Failed to add card: ${error.message}`,
          variant: "destructive"
        });
        return;
      }
      
      // Update local state with the card from Supabase
      const formattedCard = {
        ...data,
        priority: (data.priority as 'low' | 'medium' | 'high') || 'medium',
        points: data.points || 5
      } as AdminTestingCardData;
      
      setCards(prevCards => [...prevCards, formattedCard]);
      
      toast({
        title: "Success",
        description: "New card created successfully",
      });
    } catch (error) {
      console.error('Error in handleAddCard:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while adding the card",
        variant: "destructive"
      });
    }
  };

  // Update a card
  const handleUpdateCard = (updatedCard: AdminTestingCardData) => {
    setCards(prevCards => prevCards.map(card => 
      card.id === updatedCard.id ? updatedCard : card
    ));
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-white mb-6">Admin Testing Panel</h1>
        
        <div className="bg-red-500 text-white p-6 mb-6 rounded-lg">
          <h2 className="text-3xl font-bold">ADMIN TESTING PAGE</h2>
          <p>This page is for testing admin functionality only.</p>
        </div>
        
        <div className="flex justify-end mb-6">
          <Button 
            onClick={handleAddCard}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Card
          </Button>
        </div>
        
        {isLoading ? (
          <div className="text-center text-white p-8">Loading cards...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map(card => (
              <AdminTestingCard
                key={card.id}
                card={card}
                id={card.id}
                title={card.title}
                description={card.description}
                priority={card.priority}
                points={card.points}
                globalCarouselIndex={globalCarouselIndex}
                onUpdate={handleUpdateCard}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminTesting;
