
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
    fallbackIcon: card.icon || null
  });

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
        <CardHeader
          priority={cardData.priority}
          iconComponent={iconComponent}
          title={cardData.title}
          points={cardData.points}
          titleColor={cardData.title_color}
        />
        <CardContent
          description={cardData.description}
          usageData={usageData}
          subtextColor={cardData.subtext_color}
          highlightEffect={cardData.highlight_effect}
        />
        <CardFooter onEdit={() => setIsEditModalOpen(true)} />
      </Card>

      <AdminTestingEditModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        card={cardData}
        onSave={(updated) => {
          handleSaveCard(updated);
          onUpdate(updated);
        }}
      />
    </>
  );
};

export default AdminTestingCard;
