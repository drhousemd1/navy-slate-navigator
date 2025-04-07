
import React, { useState } from "react";
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

  const {
    cardData,
    images,
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

  const {
    visibleImage,
    transitionImage,
    isTransitioning
  } = useImageCarousel({
    images,
    globalCarouselIndex
  });

  const iconComponent = renderCardIcon({
    iconUrl: cardData.icon_url,
    iconName: cardData.iconName,
    iconColor: cardData.icon_color,
    fallbackIcon: null
  });

  const handleSaveAndUpdate = (updated: AdminTestingCardData) => {
    console.log("Saving updated card data:", updated);
    handleSaveCard(updated);
    onUpdate(updated);
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
          backgroundOpacity={cardData.background_opacity}
        />
        
        <div className="relative z-20 flex flex-col p-4 md:p-6 h-full">
          <CardHeader 
            priority={cardData.priority || "medium"} 
            points={cardData.points || 0}
          />
          
          <CardContent 
            title={cardData.title}
            description={cardData.description}
            iconComponent={iconComponent}
            titleColor={cardData.title_color}
            subtextColor={cardData.subtext_color}
            highlightEffect={cardData.highlight_effect}
          />
          
          <CardFooter 
            calendarColor={cardData.calendar_color || '#7E69AB'}
            usageData={usageData}
            onEditClick={() => setIsEditModalOpen(true)}
          />
        </div>
      </Card>

      <AdminTestingEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        cardData={cardData}
        onSave={handleSaveAndUpdate}
        onDelete={(id) => {
          // Handle deletion if needed
        }}
        localStorageKey="adminTestingCards"
        carouselTimer={5}
        onCarouselTimerChange={() => {}}
      />
    </>
  );
};

export default AdminTestingCard;
