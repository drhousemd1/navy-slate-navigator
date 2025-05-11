
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import AdminTestingCard from '@/components/admin-testing/AdminTestingCard';
import ActivityDataReset from '@/components/admin-testing/ActivityDataReset';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AdminTestingCardData } from '@/components/admin-testing/defaultAdminTestingCards';
import { toast } from "@/hooks/use-toast";
import { useAdminCards } from '@/data/hooks/useAdminCards';
import { useSyncManager } from '@/data/sync/useSyncManager';

const AdminTesting = () => {
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);
  const [carouselTimer, setCarouselTimer] = useState(5);

  // Use our new centralized hooks
  const { 
    adminCards, 
    isLoading, 
    addAdminCard, 
    updateCard
  } = useAdminCards();
  
  // Set up sync manager for admin cards
  const { syncNow } = useSyncManager({ 
    intervalMs: 30000,
    enabled: true
  });

  useEffect(() => {
    // Initial sync on component mount
    syncNow();
    
    // Load carousel timer from localStorage
    const savedTimer = parseInt(localStorage.getItem('adminTestingCards_carouselTimer') || '5', 10);
    setCarouselTimer(savedTimer);
    
    // Setup carousel rotation interval
    const intervalId = setInterval(() => {
      setGlobalCarouselIndex(prev => prev + 1);
    }, savedTimer * 1000);
    
    return () => clearInterval(intervalId);
  }, [syncNow]);

  const handleAddCard = async () => {
    try {
      await addAdminCard();
    } catch (error) {
      console.error('Error adding new card:', error);
      toast({
        title: "Error",
        description: "Failed to add a new card",
        variant: "destructive"
      });
    }
  };

  const handleUpdateCard = (updatedCard: AdminTestingCardData) => {
    updateCard(updatedCard);
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
        ) : adminCards.length === 0 ? (
          <div className="text-center text-white p-8">
            <p>No cards found. Click the "Add New Card" button to create one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminCards.map(card => (
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
        
        {/* Activity Data Reset Section */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Data Management</h2>
          <ActivityDataReset />
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminTesting;
