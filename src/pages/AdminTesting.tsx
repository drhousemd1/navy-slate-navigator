
import React, { useEffect, useState } from 'react';
import AdminTestingCard from '@/components/admin-testing/AdminTestingCard';
import { ThroneRoomCardData } from '@/components/throne/ThroneRoomEditModal';
import { defaultThroneRoomCards } from '@/components/throne/defaultThroneRoomCards';
import AppLayout from '@/components/AppLayout';

interface AdminTestingCardData extends ThroneRoomCardData {
  IconComponent?: React.ComponentType<any>;
}

const AdminTesting = () => {
  const [adminTestingCards, setAdminTestingCards] = useState<AdminTestingCardData[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIndex((prev) => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleEdit = (updatedCard: AdminTestingCardData) => {
    setAdminTestingCards((prev) =>
      prev.map((card) => (card.id === updatedCard.id ? updatedCard : card))
    );
  };

  const handleDelete = (cardId: string) => {
    setAdminTestingCards((prev) => prev.filter((card) => card.id !== cardId));
  };

  useEffect(() => {
    const savedCards = localStorage.getItem('adminTestingCards');
    if (savedCards) {
      try {
        const parsed = JSON.parse(savedCards);
        // Add IconComponent from defaultThroneRoomCards if available
        const cardsWithIcons = parsed.map((card: AdminTestingCardData) => {
          const defaultCard = defaultThroneRoomCards.find(d => d.id === card.id);
          if (defaultCard) {
            return { 
              ...card, 
              IconComponent: defaultCard.icon 
            };
          }
          return card;
        });
        setAdminTestingCards(cardsWithIcons);
      } catch (error) {
        console.error("Error parsing saved cards:", error);
        setAdminTestingCards([]);
      }
    }
  }, []);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-white text-2xl font-bold">Admin Testing Page</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adminTestingCards.map((card) => (
            <AdminTestingCard
              key={card.id}
              card={card}
              carouselIndex={carouselIndex}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminTesting;
