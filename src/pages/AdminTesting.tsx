import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import ThroneRoomEditModal, { ThroneRoomCardData } from '@/components/throne/ThroneRoomEditModal';
import { defaultThroneRoomCards } from '@/components/throne/defaultThroneRoomCards';
import { renderCardIcon } from '@/components/throne/utils/renderCardIcon';
import CardHeader from '@/components/throne/card/CardHeader';
import CardContent from '@/components/throne/card/CardContent';
import CardFooter from '@/components/throne/card/CardFooter';
import { toast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

const AdminTesting = () => {
  const [adminTestingCards, setAdminTestingCards] = useState<ThroneRoomCardData[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<ThroneRoomCardData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log("AdminTesting: Component mounted");
    
    toast({
      title: "Admin Testing Page",
      description: "Admin testing page has been loaded",
    });
    
    try {
      console.log("AdminTesting: Loading cards from localStorage");
      const saved = localStorage.getItem('adminTestingCards');
      
      if (saved) {
        try {
          const parsedCards = JSON.parse(saved);
          console.log("AdminTesting: Loaded cards:", parsedCards);
          
          if (Array.isArray(parsedCards) && parsedCards.length > 0) {
            setAdminTestingCards(parsedCards);
            setIsInitialized(true);
          } else {
            console.log("AdminTesting: Saved cards array was empty, initializing with defaults");
            initializeDefaultCards();
          }
        } catch (err) {
          console.error('Error parsing adminTestingCards:', err);
          initializeDefaultCards();
        }
      } else {
        console.log("AdminTesting: No saved cards found, initializing with defaults");
        initializeDefaultCards();
      }
    } catch (error) {
      console.error("AdminTesting: Error in initialization:", error);
      initializeDefaultCards();
    }
  }, []);

  const initializeDefaultCards = () => {
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
        priority: card.priority || 'medium'
      }));
      
      console.log("AdminTesting: Setting initial cards:", initialCards);
      setAdminTestingCards(initialCards);
      localStorage.setItem('adminTestingCards', JSON.stringify(initialCards));
      setIsInitialized(true);
    } catch (error) {
      console.error("AdminTesting: Error initializing default cards:", error);
    }
  };

  useEffect(() => {
    if (!isInitialized) return;
    
    const stored = parseInt(localStorage.getItem('adminTesting_carouselTimer') || '5', 10);
    const interval = setInterval(() => {
      setCarouselIndex((prev) => prev + 1);
    }, (isNaN(stored) ? 5 : stored) * 1000);
    
    return () => clearInterval(interval);
  }, [isInitialized]);

  const handleSaveCard = (updatedData: ThroneRoomCardData) => {
    console.log("AdminTesting: Saving card", updatedData);
    setAdminTestingCards(prev => {
      const index = prev.findIndex(c => c.id === updatedData.id);
      if (index >= 0) {
        const newArr = [...prev];
        newArr[index] = updatedData;
        localStorage.setItem('adminTestingCards', JSON.stringify(newArr));
        return newArr;
      } else {
        const newArr = [...prev, updatedData];
        localStorage.setItem('adminTestingCards', JSON.stringify(newArr));
        return newArr;
      }
    });
  };

  const handleAddCard = () => {
    const newId = `card-${Date.now()}`;
    const newCard: ThroneRoomCardData = {
      id: newId,
      title: 'New Card',
      description: 'This is a new card description',
      iconName: '',
      icon_color: '#FFFFFF',
      title_color: '#FFFFFF',
      subtext_color: '#8E9196',
      calendar_color: '#7E69AB',
      highlight_effect: false,
      priority: 'medium'
    };

    setAdminTestingCards(prev => {
      const newArr = [...prev, newCard];
      localStorage.setItem('adminTestingCards', JSON.stringify(newArr));
      return newArr;
    });

    toast({
      title: "Card Added",
      description: "A new card has been added successfully",
    });
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
          <h2 className="text-xl font-bold text-white">Section 1</h2>
          <Button 
            className="bg-green-500 hover:bg-green-600 text-white"
            onClick={handleAddCard}
          >
            Add Card
          </Button>
        </div>
        
        {!isInitialized ? (
          <div className="flex items-center justify-center h-64 bg-navy rounded-lg">
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
                <Card key={card.id} className="relative overflow-hidden border-2 border-[#00f0ff] bg-navy">
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
                      usageData={card.usage_data || [1, 0, 1, 0, 0, 0, 0]}
                      onEditClick={() => {
                        setSelectedCard(card);
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
        <ThroneRoomEditModal
          isOpen={isEditModalOpen}
          cardData={selectedCard}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveCard}
        />
      )}
    </AppLayout>
  );
};

export default AdminTesting;
