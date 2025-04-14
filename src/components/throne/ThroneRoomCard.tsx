
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import ThroneRoomEditModal from '@/components/throne/ThroneRoomEditModal';
import CardBackground from '@/components/throne/card/CardBackground';
import CardHeader from '@/components/throne/card/CardHeader';
import CardContent from '@/components/throne/card/CardContent';
import CardFooter from '@/components/throne/card/CardFooter';
import { useCardData } from '@/components/throne/hooks/useCardData';
import { useImageCarousel } from '@/components/throne/hooks/useImageCarousel';
import { renderCardIcon } from '@/components/throne/utils/renderCardIcon';

interface ThroneRoomCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  id: string;
  priority?: 'low' | 'medium' | 'high';
  points?: number;
  globalCarouselIndex: number;
}

const ThroneRoomCard: React.FC<ThroneRoomCardProps> = ({ 
  title, 
  description, 
  icon, 
  id, 
  priority = 'medium', 
  points = 5, 
  globalCarouselIndex 
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const { 
    cardData, 
    images, 
    usageData, 
    handleSaveCard 
  } = useCardData({ id, title, description, priority });
  
  const { 
    visibleImage, 
    transitionImage, 
    isTransitioning 
  } = useImageCarousel({ images, globalCarouselIndex });

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const iconComponent = renderCardIcon({
    iconUrl: cardData.icon_url,
    iconName: cardData.iconName,
    iconColor: cardData.icon_color,
    fallbackIcon: icon
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
          backgroundOpacity={cardData.background_opacity}
        />

        <div className="relative z-20 flex flex-col p-4 md:p-6 h-full">
          <CardHeader 
            priority={cardData.priority || priority}
            points={points}
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
            onEditClick={handleOpenEditModal}
          />
        </div>
      </Card>
      
      <ThroneRoomEditModal 
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        cardData={cardData}
        onSave={handleSaveCard}
      />
    </>
  );
};

export default ThroneRoomCard;
