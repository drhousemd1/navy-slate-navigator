
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import ThroneRoomEditModal, { ThroneRoomCardData } from '@/components/throne/ThroneRoomEditModal';
import { defaultThroneRoomCards } from '@/components/throne/defaultThroneRoomCards';
import { renderCardIcon } from '@/components/throne/utils/renderCardIcon';
import CardHeader from '@/components/throne/card/CardHeader';
import CardContent from '@/components/throne/card/CardContent';
import CardFooter from '@/components/throne/card/CardFooter';

const AdminTesting = () => {
  const [adminTestingCards, setAdminTestingCards] = useState<ThroneRoomCardData[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<ThroneRoomCardData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load admin testing cards from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('adminTestingCards');
    if (saved) {
      try {
        const parsedCards = JSON.parse(saved);
        setAdminTestingCards(parsedCards);
      } catch (err) {
        console.error('Error parsing adminTestingCards:', err);
      }
    } else {
      // Initialize with default cards if none exist
      const initialCards = defaultThroneRoomCards.map(card => ({
        id: card.id,
        title: card.title,
        description: card.description,
        iconName: '',
        icon_color: '#FFFFFF',
        title_color: '#FFFFFF',
        subtext_color: '#8E9196',
        calendar_color: '#7E69AB',
        highlight_effect: false,
        priority: card.priority || 'medium'
      }));
      setAdminTestingCards(initialCards);
      localStorage.setItem('adminTestingCards', JSON.stringify(initialCards));
    }
  }, []);

  // Carousel timer effect
  useEffect(() => {
    const stored = parseInt(localStorage.getItem('adminTesting_carouselTimer') || '5', 10);
    const interval = setInterval(() => {
      setCarouselIndex((prev) => prev + 1);
    }, (isNaN(stored) ? 5 : stored) * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSaveCard = (updatedData: ThroneRoomCardData) => {
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

  return (
    <AppLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-white mb-6">Admin Testing Panel</h1>
        
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
                    titleColor={card.title_color}
                    subtextColor={card.subtext_color}
                    highlightEffect={card.highlight_effect}
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
