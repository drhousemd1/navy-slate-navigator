import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import AdminTestingCard from '@/components/admin-testing/AdminTestingCard';
import ActivityDataReset from '@/components/admin-testing/ActivityDataReset';
import { defaultAdminTestingCards } from '@/components/throne/defaultThroneRoomCards';
import { AdminTestingCardData } from '@/components/admin-testing/defaultAdminTestingCards';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { toast } from "@/hooks/use-toast";
import { getSupabaseClient } from '@/integrations/supabase/client';

const AdminTesting = () => {
  const [cards, setCards] = useState<AdminTestingCardData[]>([]);
  const [isReorderMode, setIsReorderMode] = useState(false);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('admin_testing_cards')
          .select('*')
          .order('order', { ascending: true });

        if (error) {
          console.error("Error fetching admin testing cards:", error);
          toast({
            title: "Error",
            description: `Failed to fetch cards: ${error.message}`,
            variant: "destructive"
          });
          setCards(defaultAdminTestingCards);
          return;
        }

        // If no cards are found, initialize with default cards
        if (!data || data.length === 0) {
          console.log("No cards found in database, initializing with default cards");
          setCards(defaultAdminTestingCards);
          return;
        }

        // Ensure that the fetched cards have the correct type
        const typedCards = data as AdminTestingCardData[];
        setCards(typedCards);
      } catch (error) {
        console.error("Error fetching admin testing cards:", error);
        toast({
          title: "Error",
          description: "Failed to fetch cards",
          variant: "destructive"
        });
        setCards(defaultAdminTestingCards);
      }
    };

    fetchCards();
  }, []);

  const handleUpdateCard = (updatedCard: AdminTestingCardData) => {
    setCards(prevCards =>
      prevCards.map(card => (card.id === updatedCard.id ? updatedCard : card))
    );
  };

  const handleOnDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(cards);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update the order property of each card
    const updatedCards = items.map((card, index) => ({ ...card, order: index }));
    setCards(updatedCards);

    // Save the new order to the database
    try {
      const supabase = getSupabaseClient();
      for (const card of updatedCards) {
        const { error } = await supabase
          .from('admin_testing_cards')
          .update({ order: card.order })
          .eq('id', card.id);

        if (error) {
          throw new Error(`Failed to update card order: ${error.message}`);
        }
      }

      toast({
        title: "Cards Reordered",
        description: "The card order has been updated",
      });
    } catch (error: any) {
      console.error("Error updating card order:", error);
      toast({
        title: "Error",
        description: `Failed to update card order: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-navy p-6">
      <div className="container mx-auto">
        <h1 className="text-3xl font-semibold text-white mb-6">Admin Testing</h1>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-300">Card Management</h2>
          <Button onClick={() => setIsReorderMode(!isReorderMode)}>
            {isReorderMode ? 'Disable Reorder' : 'Enable Reorder'}
          </Button>
        </div>
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <Droppable droppableId="cards" direction="horizontal">
            {(provided) => (
              <ul className="flex flex-wrap gap-4" {...provided.droppableProps} ref={provided.innerRef}>
                {cards.map((card, index) => (
                  <Draggable key={card.id} draggableId={card.id} index={index}>
                    {(provided) => (
                      <li
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={provided.draggableProps.style}
                      >
                        <AdminTestingCard
                          key={card.id}
                          {...card}
                          globalCarouselIndex={index}
                          onUpdate={handleUpdateCard}
                          card={card}
                          isReorderMode={isReorderMode}
                        />
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
        <ActivityDataReset />
      </div>
    </div>
  );
};

export default AdminTesting;
