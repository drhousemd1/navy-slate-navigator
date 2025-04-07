
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import AdminTestingCard from '@/components/admin-testing/AdminTestingCard';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AdminTestingCardData } from '@/components/admin-testing/defaultAdminTestingCards';

const AdminTesting = () => {
  const [cards, setCards] = useState<AdminTestingCardData[]>([]);
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);
  const [carouselTimer, setCarouselTimer] = useState(5);

  // Load cards and carousel timer from localStorage
  useEffect(() => {
    const savedCards = JSON.parse(localStorage.getItem('adminTestingCards') || '[]');
    const savedTimer = parseInt(localStorage.getItem('adminTestingCards_carouselTimer') || '5', 10);
    
    setCards(savedCards);
    setCarouselTimer(savedTimer);
    
    // Start the carousel interval
    const intervalId = setInterval(() => {
      setGlobalCarouselIndex(prev => prev + 1);
    }, savedTimer * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Add a new card
  const handleAddCard = () => {
    const newCard: AdminTestingCardData = {
      id: uuidv4(),
      title: 'New Card',
      description: 'This is a new admin testing card.',
      priority: 'medium',
      points: 5,
      background_opacity: 80,
      title_color: '#FFFFFF',
      subtext_color: '#8E9196',
      calendar_color: '#7E69AB',
      icon_color: '#FFFFFF',
      focal_point_x: 50,
      focal_point_y: 50,
      highlight_effect: false,
      usage_data: [0, 0, 0, 0, 0, 0, 0]
    };
    
    const updatedCards = [...cards, newCard];
    setCards(updatedCards);
    localStorage.setItem('adminTestingCards', JSON.stringify(updatedCards));
  };

  // Update a card
  const handleUpdateCard = (updatedCard: AdminTestingCardData) => {
    const updatedCards = cards.map(card => 
      card.id === updatedCard.id ? updatedCard : card
    );
    setCards(updatedCards);
    localStorage.setItem('adminTestingCards', JSON.stringify(updatedCards));
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
      </div>
    </AppLayout>
  );
};

export default AdminTesting;
