
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

const AdminTesting = () => {
  const [adminTestingCards, setAdminTestingCards] = useState<ThroneRoomCardData[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<ThroneRoomCardData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load admin testing cards from localStorage on mount
  useEffect(() => {
    console.log("AdminTesting: Component mounted");
    
    // Always show a toast notification to confirm the page is loading
    toast({
      title: "Admin Testing Page",
      description: "Admin testing page has been loaded",
    });
    
    // Initialize cards
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
        // Initialize with default cards if none exist
        console.log("AdminTesting: No saved cards found, initializing with defaults");
        initializeDefaultCards();
      }
    } catch (error) {
      console.error("AdminTesting: Error in initialization:", error);
      // Ensure we always have cards
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

  // Carousel timer effect
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

  console.log("AdminTesting: Rendering with cards:", adminTestingCards);

  return (
    <AppLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-white mb-6">TESTING PAGE - ADMIN TESTING PANEL</h1>
        
        <div className="bg-red-500 text-white p-6 mb-6 rounded-lg text-center text-3xl font-bold">
          THIS IS THE ADMIN TESTING PAGE
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4 bg-navy border border-light-navy">
            <h2 className="text-xl text-white mb-2">Feature Testing</h2>
            <p className="text-gray-300">This area is for testing new features before deploying them to all users.</p>
          </Card>
          
          <Card className="p-4 bg-navy border border-light-navy">
            <h2 className="text-xl text-white mb-2">User Management</h2>
            <p className="text-gray-300">Test user management functionality.</p>
          </Card>
          
          <Card className="p-4 bg-navy border border-light-navy">
            <h2 className="text-xl text-white mb-2">Database Operations</h2>
            <p className="text-gray-300">Test database queries and operations.</p>
          </Card>
          
          <Card className="p-4 bg-navy border border-light-navy">
            <h2 className="text-xl text-white mb-2">System Status</h2>
            <p className="text-gray-300">View system status and logs.</p>
          </Card>
        </div>
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
