
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import RuleEditModal from '@/components/rule/RuleEditModal';
import CardBackground from '@/components/rule/card/CardBackground';
import { useRuleCardData, RuleCardData } from '@/components/rule/hooks/useRuleCardData';
import { useImageCarousel } from '@/components/rule/hooks/useImageCarousel';
import { renderCardIcon } from '@/components/rule/utils/renderCardIcon';
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

// Import card sections from admin testing for now, will be updated to rule-specific versions
import CardHeader from '@/components/admin-testing/card/CardHeader';
import CardContent from '@/components/admin-testing/card/CardContent';
import CardFooter from '@/components/admin-testing/card/CardFooter';

export interface RuleCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  id: string;
  priority?: 'low' | 'medium' | 'high';
  points?: number;
  globalCarouselIndex: number;
  onUpdate?: (updated: RuleCardData) => void;
  card?: RuleCardData;
}

const RuleCard: React.FC<RuleCardProps> = ({
  title,
  description,
  icon,
  id,
  priority = 'medium',
  points = 5,
  globalCarouselIndex,
  onUpdate,
  card
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [carouselTimer, setCarouselTimer] = useState(5);

  const {
    cardData,
    images,
    usageData,
    handleSaveCard
  } = useRuleCardData({ 
    id: card?.id || id, 
    title: card?.title || title, 
    description: card?.description || description, 
    priority: card?.priority || priority,
    points: card?.points || points,
    icon_url: card?.icon_url,
    icon_name: card?.icon_name || "",
    background_images: card?.background_images as string[] || [],
    background_image_url: card?.background_image_url
  });

  const {
    visibleImage,
    transitionImage,
    isTransitioning
  } = useImageCarousel({ images, globalCarouselIndex });

  const handleOpenEditModal = () => setIsEditModalOpen(true);
  const handleCloseEditModal = () => setIsEditModalOpen(false);

  const iconComponent = renderCardIcon({
    iconUrl: cardData.icon_url,
    iconName: cardData.icon_name,
    iconColor: cardData.icon_color,
    fallbackIcon: icon
  });

  const handleDeleteCard = async (cardId: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', cardId);
      
      if (error) {
        console.error("Error deleting rule from Supabase:", error);
        toast({
          title: "Error",
          description: `Failed to delete rule: ${error.message}`,
          variant: "destructive"
        });
        return;
      }
      
      // Notify about the deletion
      toast({
        title: "Rule Deleted",
        description: "The rule has been deleted",
      });
      
      // Close the modal
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive"
      });
    }
  };

  const handleCarouselTimerChange = (newValue: number) => {
    setCarouselTimer(newValue);
    // Store carousel timer in localStorage for now as it's a global setting
    localStorage.setItem("rules_carouselTimer", newValue.toString());
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
          <CardHeader priority={cardData.priority || priority} points={cardData.points || points} />
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
      <RuleEditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        cardData={cardData}
        onSave={(updated) => {
          handleSaveCard(updated);
          if (onUpdate) {
            onUpdate(updated);
          }
        }}
        onDelete={handleDeleteCard}
        localStorageKey="rules"
        carouselTimer={carouselTimer}
        onCarouselTimerChange={handleCarouselTimerChange}
      />
    </>
  );
};

export default RuleCard;
