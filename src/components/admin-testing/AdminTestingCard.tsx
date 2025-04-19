import React, { useState, useRef, useLayoutEffect } from 'react';
import { Card } from '@/components/ui/card';
import AdminTestingEditModal from '@/components/admin-testing/AdminTestingEditModal';
import CardBackground from '@/components/admin-testing/card/CardBackground';
import CardHeader from '@/components/admin-testing/card/CardHeader';
import CardContent from '@/components/admin-testing/card/CardContent';
import CardFooter from '@/components/admin-testing/card/CardFooter';
import { useAdminCardData } from '@/components/admin-testing/hooks/useAdminCardData';
import { useImageCarousel } from '@/components/admin-testing/hooks/useImageCarousel';
import { renderCardIcon } from '@/components/admin-testing/utils/renderCardIcon';
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { AdminTestingCardData } from "./defaultAdminTestingCards";
import { MoveVertical } from 'lucide-react';

export interface AdminTestingCardProps {
  id?: string;
  title?: string;
  description?: string | null;
  icon?: React.ReactNode;
  priority?: 'low' | 'medium' | 'high';
  points?: number;
  globalCarouselIndex?: number;
  onUpdate?: (card: AdminTestingCardData) => void;
  card?: AdminTestingCardData;
  isReorderMode?: boolean;
}

const AdminTestingCard: React.FC<AdminTestingCardProps> = ({
  id,
  title,
  description,
  icon,
  priority = 'medium',
  points = 5,
  globalCarouselIndex,
  onUpdate,
  card,
  isReorderMode = false
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [carouselTimer, setCarouselTimer] = useState(5);
  const cardRef = useRef<HTMLDivElement>(null);
  const [fixedHeight, setFixedHeight] = useState<number | undefined>();

  // Freeze card height the moment Re-order mode toggles on
  useLayoutEffect(() => {
    if (isReorderMode && cardRef.current) {
      setFixedHeight(cardRef.current.getBoundingClientRect().height);
    } else {
      setFixedHeight(undefined);
    }
  }, [isReorderMode]);

  const {
    cardData,
    images,
    usageData,
    isTransitioning,
    handleSaveCard
  } = useAdminCardData({
    id: card?.id || id || '',
    title: card?.title || title || '',
    description: card?.description ?? description,
    priority: card?.priority || priority,
    points: card?.points || points,
    icon_url: cardData.icon_url,
    icon_name: cardData.icon_name || '',
    icon_color: cardData.icon_color || '#FFFFFF',
    background_images: cardData.background_images,
    background_image_url: cardData.background_image_url
  });

  const {
    visibleImage,
    transitionImage
  } = useImageCarousel(images, globalCarouselIndex || 0, carouselTimer);

  const iconComponent = renderCardIcon({
    iconUrl: cardData.icon_url,
    iconName: cardData.icon_name,
    iconColor: cardData.icon_color,
    fallbackIcon: icon
  });

  const handleDeleteCard = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('admin_testing_cards')
        .delete()
        .eq('id', cardId);
      if (error) {
        toast({
          title: "Error",
          description: `Failed to delete card: ${error.message}`,
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Error deleting card:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
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
      <Card
        ref={cardRef}
        data-testid="admin-card"
        style={fixedHeight ? { height: fixedHeight } : {}}
        className={`relative overflow-hidden border-2 ${
          isReorderMode ? 'border-amber-500' : 'border-[#00f0ff]'
        } bg-navy`}
      >
        {isReorderMode && (
          <div
            className="absolute top-2 left-2 z-50 bg-amber-500 text-white p-1 rounded-md flex items-center pointer-events-none"
          >
            <MoveVertical className="h-4 w-4 mr-1" />
            <span className="text-xs">Drag to reorder</span>
          </div>
        )}

        <CardBackground
          visibleImage={visibleImage}
          transitionImage={transitionImage}
          isTransitioning={isTransitioning}
        />

        <CardHeader
          title={cardData.title}
          titleColor={cardData.title_color}
          subtextColor={cardData.subtext_color}
        />

        <CardContent
          description={cardData.description}
          priority={cardData.priority}
          points={cardData.points}
          icon={iconComponent}
        />

        <CardFooter usageData={usageData} calendarColor={cardData.calendar_color} />

      </Card>

      <AdminTestingEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        cardData={cardData}
        onSave={(updated) => {
          handleSaveCard(updated);
          if (onUpdate) {
            onUpdate(updated);
          }
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