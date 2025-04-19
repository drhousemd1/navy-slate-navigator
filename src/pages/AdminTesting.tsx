import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import AdminTestingCard from '@/components/admin-testing/AdminTestingCard';
import ActivityDataReset from '@/components/admin-testing/ActivityDataReset';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Plus, MoveVertical } from 'lucide-react';
import { AdminTestingCardData } from '@/components/admin-testing/defaultAdminTestingCards';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, DropResult, DragStart } from '@hello-pangea/dnd';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SupabaseCardData {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  points?: number | null;
  background_image_url: string | null;
  background_images: any;
  background_opacity: number | null;
  focal_point_x: number | null;
  focal_point_y: number | null;
  title_color: string | null;
  subtext_color: string | null;
  calendar_color: string | null;
  icon_url: string | null;
  icon_name: string | null;
  icon_color: string | null;
  highlight_effect: boolean | null;
  usage_data: any;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
  order: number | null;
}

const AdminTesting = () => {
  const [cards, setCards] = useState<AdminTestingCardData[]>([]);
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0);
  const [carouselTimer, setCarouselTimer] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [cardsFetched, setCardsFetched] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const draggedItemId = useRef<string | null>(null);
  const scrollPositionRef = useRef(0);
  const cardsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching cards from Supabase...");
        
        if (!supabase) {
          console.error("Supabase client is not initialized!");
          toast({
            title: "Error",
            description: "Database connection is not available",
            variant: "destructive"
          });
          return;
        }

        const { data, error } = await supabase
          .from('admin_testing_cards')
          .select('*')
          .order('order', { ascending: true });
        
        if (error) {
          console.error('Error fetching cards from Supabase:', error);
          toast({
            title: "Error",
            description: `Failed to load cards: ${error.message}`,
            variant: "destructive"
          });
          return;
        }
        
        console.log("Received data from Supabase:", data);
        setCardsFetched(true);
        
        if (data && data.length > 0) {
          const formattedCards = data.map((card: SupabaseCardData) => ({
            ...card,
            priority: (card.priority as 'low' | 'medium' | 'high') || 'medium',
            points: typeof card.points === 'number' ? card.points : 5,
            background_opacity: card.background_opacity || 80,
            focal_point_x: card.focal_point_x || 50,
            focal_point_y: card.focal_point_y || 50,
            title_color: card.title_color || '#FFFFFF',
            subtext_color: card.subtext_color || '#8E9196',
            calendar_color: card.calendar_color || '#7E69AB',
            icon_url: card.icon_url || null,
            icon_name: card.icon_name || null,
            icon_color: card.icon_color || '#FFFFFF',
            highlight_effect: card.highlight_effect || false,
            usage_data: card.usage_data || [0, 0, 0, 0, 0, 0, 0],
            background_images: Array.isArray(card.background_images) ? card.background_images : [],
            order: card.order || 0
          })) as AdminTestingCardData[];
          
          console.log("Formatted cards:", formattedCards);
          setCards(formattedCards);
        } else {
          console.log("No cards found in the database, creating a default card");
          await handleAddCard();
        }
      } catch (error) {
        console.error('Error in fetchCards:', error);
        toast({
          title: "Error",
          description: "Failed to load cards. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCards();
    
    const savedTimer = parseInt(localStorage.getItem('adminTestingCards_carouselTimer') || '5', 10);
    setCarouselTimer(savedTimer);
    
    const intervalId = setInterval(() => {
      setGlobalCarouselIndex(prev => prev + 1);
    }, savedTimer * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

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
      usage_data: [0, 0, 0, 0, 0, 0, 0],
      background_images: [],
      order: cards.length
    };
    
    try {
      console.log("Adding new card to Supabase:", newCard);
      
      const { data, error } = await supabase
        .from('admin_testing_cards')
        .insert({
          ...newCard,
          points: newCard.points || 0
        })
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
      
      console.log("Card added successfully:", data);
      
      const supabaseData = data as SupabaseCardData;
      const formattedCard = {
        ...data,
        priority: (supabaseData.priority as 'low' | 'medium' | 'high') || 'medium',
        points: typeof supabaseData.points === 'number' ? supabaseData.points : 5,
        background_images: Array.isArray(supabaseData.background_images) ? supabaseData.background_images : [],
        order: supabaseData.order || cards.length
      } as AdminTestingCardData;
      
      setCards(prevCards => [...prevCards, formattedCard]);
      
      toast({
        title: "Success",
        description: "New card created successfully",
      });
      
      return formattedCard;
    } catch (error) {
      console.error('Error in handleAddCard:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while adding the card",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleUpdateCard = (updatedCard: AdminTestingCardData) => {
    setCards(prevCards => prevCards.map(card => 
      card.id === updatedCard.id ? updatedCard : card
    ));
  };

  const toggleReorderMode = () => {
    console.log("Toggling reorder mode:", !isReorderMode);
    
    if (isReorderMode) {
      saveCardOrder();
    }
    
    setIsReorderMode(!isReorderMode);
  };

  const preventTouchMove = (e: TouchEvent) => {
    if (isDragging && !e.target?.closest?.('.scrollable')) {
      e.preventDefault();
    }
  };

  const onDragStart = (result: DragStart) => {
    setIsDragging(true);
    draggedItemId.current = result.draggableId;
    
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.addEventListener('touchmove', preventTouchMove, { passive: false });
  };

  const onDragEnd = (result: DropResult) => {
    setIsDragging(false);
    draggedItemId.current = null;
    
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    document.removeEventListener('touchmove', preventTouchMove);
    
    if (!result.destination || result.destination.index === result.source.index) {
      return;
    }

    const reordered = Array.from(cards);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    setCards(reordered.map((card, index) => ({
      ...card,
      order: index
    })));
  };

  const saveCardOrder = async () => {
    try {
      setIsSavingOrder(true);
      console.log("Saving card order to database");

      const updates = cards.map(card => ({
        id: card.id,
        order: card.order
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('admin_testing_cards')
          .update({ order: update.order })
          .eq('id', update.id);

        if (error) {
          console.error('Error updating card order:', error);
          toast({
            title: "Error",
            description: `Failed to save card order: ${error.message}`,
            variant: "destructive"
          });
          return;
        }
      }

      toast({
        title: "Success",
        description: "Card order saved successfully",
      });
    } catch (error) {
      console.error('Error in saveCardOrder:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving card order",
        variant: "destructive"
      });
    } finally {
      setIsSavingOrder(false);
    }
  };

  console.log("Render admin testing page, reorder mode:", isReorderMode);

  return (
    <AppLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-white mb-6">Admin Testing Panel</h1>
        
        <div className="bg-red-500 text-white p-6 mb-6 rounded-lg">
          <h2 className="text-3xl font-bold">ADMIN TESTING PAGE</h2>
          <p>This page is for testing admin functionality only.</p>
        </div>
        
        <div className="flex justify-end gap-2 mb-6">
          <Button 
            onClick={toggleReorderMode}
            className={isReorderMode ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
          >
            <MoveVertical className="mr-2 h-4 w-4" />
            {isReorderMode ? "Save Order" : "Reorder Cards"}
          </Button>
          <Button 
            onClick={handleAddCard}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isReorderMode}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Card
          </Button>
        </div>
        
        {isLoading ? (
          <div className="text-center text-white p-8">Loading cards...</div>
        ) : cards.length === 0 && cardsFetched ? (
          <div className="text-center text-white p-8">
            <p>No cards found. Click the "Add New Card" button to create one.</p>
          </div>
        ) : (
          <DragDropContext
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <Droppable droppableId="admin-cards" isDropDisabled={!isReorderMode}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex flex-col gap-y-6"
                >
                  {cards.map((card, index) => (
                    <Draggable
                      key={card.id}
                      draggableId={card.id}
                      index={index}
                      isDragDisabled={!isReorderMode}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={snapshot.isDragging ? 'dragging' : ''}
                        >
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
                            isReorderMode={isReorderMode}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
        
        <div className="mt-12">
          <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Data Management</h2>
          <ActivityDataReset />
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminTesting;
