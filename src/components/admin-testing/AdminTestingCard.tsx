
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import AdminTestingEditModal from "./AdminTestingEditModal";
import CardBackground from "./card/CardBackground";
import CardHeader from "./card/CardHeader";
import CardContent from "./card/CardContent";
import CardFooter from "./card/CardFooter";
import { useAdminCardData } from "./hooks/useAdminCardData";
import { useImageCarousel } from "./hooks/useImageCarousel";
import { renderCardIcon } from "./utils/renderCardIcon";
import { AdminTestingCardData } from "./defaultAdminTestingCards";
import { toast } from "@/hooks/use-toast";

interface AdminTestingCardProps {
  card: AdminTestingCardData;
  globalCarouselIndex: number;
  onUpdate: (updated: AdminTestingCardData) => void;
}

const AdminTestingCard: React.FC<AdminTestingCardProps> = ({
  card,
  globalCarouselIndex,
  onUpdate
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [carouselTimer, setCarouselTimer] = useState(5);
  const [images, setImages] = useState<string[]>([]);

  const {
    cardData,
    usageData,
    handleSaveCard
  } = useAdminCardData({
    id: card.id,
    title: card.title,
    description: card.description,
    priority: card.priority || "medium",
    points: card.points || 0,
    icon_url: card.icon_url,
    iconName: card.iconName || "",
    background_images: card.background_images,
    background_image_url: card.background_image_url
  });

  useEffect(() => {
    const savedTimer = localStorage.getItem("adminTestingCards_carouselTimer");
    if (savedTimer) {
      setCarouselTimer(parseInt(savedTimer, 10) || 5);
    }
  }, []);

  useEffect(() => {
    const imageArray = Array.isArray(cardData.background_images)
      ? cardData.background_images.filter(Boolean)
      : cardData.background_image_url
        ? [cardData.background_image_url]
        : [];

    setImages(imageArray);
  }, [cardData.background_images, cardData.background_image_url]);

  const { visibleImage, transitionImage, isTransitioning } = useImageCarousel({
    images,
    globalCarouselIndex
  });

  const iconComponent = renderCardIcon({
    iconUrl: cardData.icon_url,
    iconName: cardData.iconName,
    iconColor: cardData.icon_color,
    fallbackIcon: null
  });

  const handleDeleteCard = (cardId: string) => {
    try {
      // Get current cards from localStorage
      const cards = JSON.parse(localStorage.getItem("adminTestingCards") || "[]");
      // Filter out the card to delete
      const updatedCards = cards.filter((c: AdminTestingCardData) => c.id !== cardId);
      // Save the updated cards back to localStorage
      localStorage.setItem("adminTestingCards", JSON.stringify(updatedCards));
      
      // Notify the parent component about the deletion
      toast({
        title: "Card Deleted",
        description: "The admin testing card has been deleted",
      });
      
      // Close the modal
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error deleting card:", error);
      toast({
        title: "Error",
        description: "Failed to delete card",
        variant: "destructive"
      });
    }
  };

  const handleCarouselTimerChange = (newValue: number) => {
    setCarouselTimer(newValue);
    localStorage.setItem("adminTestingCards_carouselTimer", newValue.toString());
  };

  return (
    <>
      <Card className="relative overflow-hidden border-2 border-[#00f0ff] bg-navy">
        <CardBackground
          visibleImage={visibleImage}
          transitionImage={transitionImage}
          isTransitioning={isTransitioning}
          focalPointX={cardData.focal_point_x}
          focalPointY={cardData.focal_point_y}
        />
        
        <div className="p-4">
          <CardHeader
            priority={cardData.priority}
            points={cardData.points}
          />
          
          <div className="flex items-start mt-4">
            <div className="mr-4 flex-shrink-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00f0ff' }}>
                {iconComponent}
              </div>
            </div>
            
            <div className="flex-1 flex flex-col">
              <h3 className="text-xl font-semibold" 
                  style={{ color: cardData.title_color || '#FFFFFF' }}>
                {cardData.title}
              </h3>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-sm" 
               style={{ 
                 color: cardData.subtext_color || '#8E9196',
                 backgroundColor: cardData.highlight_effect ? 'rgba(245, 245, 209, 0.7)' : 'transparent',
                 padding: cardData.highlight_effect ? '0 4px' : '0',
                 borderRadius: cardData.highlight_effect ? '4px' : '0'
               }}>
              {cardData.description}
            </p>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div></div> {/* Empty div for spacing */}
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Card>

      <AdminTestingEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        cardData={cardData}
        onSave={(updated) => {
          handleSaveCard(updated);
          onUpdate(updated);
        }}
        onDelete={handleDeleteCard}
        localStorageKey="adminTestingCards"
        carouselTimer={carouselTimer}
        onCarouselTimerChange={handleCarouselTimerChange}
      />
    </>
  );
};

export default AdminTestingCard;
