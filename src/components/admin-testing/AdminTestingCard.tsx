
import React from 'react';
import { useImageCarousel } from './hooks/useImageCarousel';
import AdminTestingCardBackground from './AdminTestingCardBackground';
import { Card } from '@/components/ui/card';
import { renderCardIcon } from '@/components/throne/utils/renderCardIcon';
import CardHeader from '@/components/throne/card/CardHeader';
import CardContent from '@/components/throne/card/CardContent';
import CardFooter from '@/components/throne/card/CardFooter';

interface AdminTestingCardProps {
  card: any; // Using any temporarily, would be better to define a proper type
  onEdit: (card: any) => void;
}

const AdminTestingCard: React.FC<AdminTestingCardProps> = ({ card, onEdit }) => {
  const images = card.background_images ? 
    Array.isArray(card.background_images) ? card.background_images.filter(Boolean) as string[] : [] 
    : [];

  const backgroundImageUrl = card.background_image_url || null;
  const allImages = backgroundImageUrl ? 
    [backgroundImageUrl, ...images] : images;

  const { visibleImage, transitionImage, isTransitioning } = useImageCarousel(
    allImages,
    5000
  );

  const IconComponent = card.IconComponent;

  return (
    <Card 
      className="relative overflow-hidden border-2 border-[#00f0ff] bg-navy cursor-pointer"
      onClick={() => onEdit(card)}
    >
      <AdminTestingCardBackground 
        visibleImage={visibleImage}
        transitionImage={transitionImage}
        isTransitioning={isTransitioning}
        focalPointX={card.focal_point_x}
        focalPointY={card.focal_point_y}
        backgroundOpacity={card.background_opacity}
      />
      
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
          titleColor={card.title_color || '#FFFFFF'}
          subtextColor={card.subtext_color || '#8E9196'}
          highlightEffect={card.highlight_effect || false}
        />
        
        <CardFooter 
          calendarColor={card.calendar_color || '#7E69AB'}
          usageData={card.usage_data || [0, 0, 0, 0, 0, 0, 0]}
          onEditClick={() => onEdit(card)}
        />
      </div>
    </Card>
  );
};

export default AdminTestingCard;
