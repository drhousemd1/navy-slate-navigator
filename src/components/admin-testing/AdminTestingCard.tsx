import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";

import AppLayout from "@/components/AppLayout";
import AdminTestingCard from "@/components/admin-testing/AdminTestingCard";
import AdminTestingCardEditModal from "@/components/admin-testing/AdminTestingCardEditModal";
import { defaultAdminTestingCards, AdminTestingCardData } from "@/components/admin-testing/defaultAdminTestingCards";
import { getIconComponent } from "@/lib/iconLibrary";
import { Button } from "@/components/ui/button";

const AdminTesting: React.FC = () => {
  const [cards, setCards] = useState<AdminTestingCardData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<AdminTestingCardData | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [globalCarouselIndex] = useState(0); // passed to each card

  useEffect(() => {
    setCards(defaultAdminTestingCards);
  }, []);

  const handleEditCard = (card: AdminTestingCardData) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleSaveCard = (updatedCard: AdminTestingCardData) => {
    setCards(prev => {
      const existingIndex = prev.findIndex(c => c.id === updatedCard.id);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = updatedCard;
        return updated;
      } else {
        return [...prev, updatedCard];
      }
    });
    setIsModalOpen(false);
    setSelectedCard(null);
  };

  const handleAddNewCard = () => {
    const newCard: AdminTestingCardData = {
      id: uuidv4(),
      title: "New Card",
      description: "",
      points: 0,
      icon_name: "CirclePlus",
      icon_color: "#ffffff",
      title_color: "#ffffff",
      subtext_color: "#ffffff",
      calendar_color: "#ffffff",
      highlight_effect: "none",
      background_image_url: "",
      background_opacity: 0.5,
      focal_point_x: 0.5,
      focal_point_y: 0.5
    };
    setCards(prev => [...prev, newCard]);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const reordered = Array.from(cards);
    const [movedCard] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, movedCard);

    setCards(reordered);
  };

  return (
    <AppLayout onAddNewItem={handleAddNewCard}>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Admin Testing</h1>
        <Button onClick={() => setIsReorderMode(prev => !prev)}>
          {isReorderMode ? "Done" : "Reorder"}
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="adminCards">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4"
            >
              {cards.map((card, index) => (
                <Draggable
                  key={card.id}
                  draggableId={card.id}
                  index={index}
                  isDragDisabled={!isReorderMode}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <AdminTestingCard
                        id={card.id}
                        title={card.title}
                        description={card.description}
                        points={card.points}
                        icon={getIconComponent(card.icon_name || "CirclePlus")}
                        icon_name={card.icon_name}
                        icon_color={card.icon_color}
                        title_color={card.title_color}
                        subtext_color={card.subtext_color}
                        calendar_color={card.calendar_color}
                        highlight_effect={card.highlight_effect}
                        background_image_url={card.background_image_url}
                        background_opacity={card.background_opacity}
                        focal_point_x={card.focal_point_x}
                        focal_point_y={card.focal_point_y}
                        globalCarouselIndex={globalCarouselIndex}
                        card={card}
                        onUpdate={handleSaveCard}
                        isReorderMode={isReorderMode}
                        onEdit={() => handleEditCard(card)}
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

      <AdminTestingCardEditModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCard(null);
        }}
        cardData={selectedCard}
        onSave={handleSaveCard}
      />
    </AppLayout>
  );
};

export default AdminTesting;
