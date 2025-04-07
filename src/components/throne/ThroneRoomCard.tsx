
import React, { useState, useEffect } from 'react';
import { Pencil, Skull, Crown, Swords, Award } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import ThroneRoomEditModal, { ThroneRoomCardData } from '@/components/throne/ThroneRoomEditModal';
import FrequencyTracker from '@/components/task/FrequencyTracker';
import PriorityBadge from '@/components/task/PriorityBadge';
import PointsBadge from '@/components/task/PointsBadge';
import TaskIcon from '@/components/task/TaskIcon';

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
  const [cardData, setCardData] = useState<ThroneRoomCardData>({
    id,
    title,
    description,
    iconName: '',
    icon_color: '#FFFFFF',
    title_color: '#FFFFFF',
    subtext_color: '#8E9196',
    calendar_color: '#7E69AB',
    highlight_effect: false,
    priority: priority
  });
  const [images, setImages] = useState<string[]>([]);
  const [visibleImage, setVisibleImage] = useState<string | null>(null);
  const [transitionImage, setTransitionImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [usageData, setUsageData] = useState<number[]>([1, 0, 1, 0, 0, 0, 0]);

  useEffect(() => {
    const savedCards = JSON.parse(localStorage.getItem('throneRoomCards') || '[]');
    const savedCard = savedCards.find((card: ThroneRoomCardData) => card.id === id);
    
    if (savedCard) {
      console.log("Loading saved card data for", id, savedCard);
      console.log("Card background images:", {
        hasBackgroundImages: Array.isArray(savedCard.background_images),
        backgroundImagesCount: Array.isArray(savedCard.background_images) ? savedCard.background_images.length : 0,
        hasBackgroundImageUrl: Boolean(savedCard.background_image_url)
      });
      
      setCardData({
        ...savedCard,
        title: savedCard.title || title,
        description: savedCard.description || description,
        priority: savedCard.priority || priority
      });
      
      const imageArray = Array.isArray(savedCard.background_images)
        ? savedCard.background_images.filter(Boolean)
        : savedCard.background_image_url
          ? [savedCard.background_image_url]
          : [];
      
      console.log("Setting image array:", imageArray);
      setImages(imageArray);
      
      if (imageArray.length > 0) {
        setVisibleImage(imageArray[0]);
      }
      
      if (Array.isArray(savedCard.usage_data) && savedCard.usage_data.length > 0) {
        setUsageData(savedCard.usage_data);
      }
    }
  }, [id, title, description, priority]);

  useEffect(() => {
    if (!images.length || !visibleImage) return;
    
    const next = images[globalCarouselIndex % images.length];
    if (next === visibleImage) return;
    
    const preload = new Image();
    preload.src = next;
    
    preload.onload = () => {
      setTransitionImage(next);
      setIsTransitioning(false);
      
      requestAnimationFrame(() => {
        setTimeout(() => {
          setIsTransitioning(true);
          
          const timeout = setTimeout(() => {
            setVisibleImage(next);
            setTransitionImage(null);
            setIsTransitioning(false);
          }, 2000);
          
          return () => clearTimeout(timeout);
        }, 0);
      });
    };
  }, [globalCarouselIndex, images, visibleImage]);

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleSaveCard = (updatedData: ThroneRoomCardData) => {
    console.log("Saving updated card data:", updatedData);
    console.log("Card background images:", {
      hasBackgroundImages: Array.isArray(updatedData.background_images),
      backgroundImagesCount: Array.isArray(updatedData.background_images) ? updatedData.background_images.length : 0,
      hasBackgroundImageUrl: Boolean(updatedData.background_image_url)
    });
    
    setCardData(updatedData);
    
    const imageArray = Array.isArray(updatedData.background_images)
      ? updatedData.background_images.filter(Boolean)
      : updatedData.background_image_url
        ? [updatedData.background_image_url]
        : [];
    
    console.log("Updated image array:", imageArray);
    setImages(imageArray);
    
    if (imageArray.length > 0) {
      const firstImage = imageArray[0];
      setVisibleImage(firstImage);
    } else {
      console.log("No valid image sources found, clearing images");
      setVisibleImage(null);
      setTransitionImage(null);
    }
    
    if (Array.isArray(updatedData.usage_data) && updatedData.usage_data.length > 0) {
      setUsageData(updatedData.usage_data);
    }
    
    const savedCards = JSON.parse(localStorage.getItem('throneRoomCards') || '[]');
    const cardIndex = savedCards.findIndex((card: ThroneRoomCardData) => card.id === id);
    
    if (cardIndex >= 0) {
      savedCards[cardIndex] = updatedData;
    } else {
      savedCards.push(updatedData);
    }
    
    localStorage.setItem('throneRoomCards', JSON.stringify(savedCards));
    
    toast({
      title: "Card Updated",
      description: "The throne room card has been updated successfully",
    });
  };

  const renderCardIcon = () => {
    if (cardData.icon_url) {
      return (
        <img 
          src={cardData.icon_url} 
          alt="Card icon" 
          className="w-6 h-6 object-contain"
          style={{ color: cardData.icon_color }}
        />
      );
    } else if (cardData.iconName) {
      return (
        <TaskIcon 
          icon_name={cardData.iconName} 
          icon_color={cardData.icon_color || '#FFFFFF'}
          className="w-6 h-6"
        />
      );
    } else {
      return icon;
    }
  };

  return (
    <>
      <Card className="relative overflow-hidden border-2 border-[#00f0ff] bg-navy">
        {visibleImage && (
          <img
            src={visibleImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-100 z-0"
            style={{ 
              transition: 'opacity 2s ease-in-out',
              objectPosition: `${cardData.focal_point_x || 50}% ${cardData.focal_point_y || 50}%`,
              opacity: (cardData.background_opacity || 100) / 100
            }}
            draggable={false}
          />
        )}

        {transitionImage && (
          <img
            src={transitionImage}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover z-10 pointer-events-none ${
              isTransitioning ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ 
              transition: 'opacity 2s ease-in-out',
              objectPosition: `${cardData.focal_point_x || 50}% ${cardData.focal_point_y || 50}%`,
              opacity: isTransitioning ? (cardData.background_opacity || 100) / 100 : 0
            }}
            draggable={false}
          />
        )}

        <div className="relative z-20 flex flex-col p-4 md:p-6 h-full">
          <div className="flex justify-between items-start mb-3">
            <PriorityBadge priority={cardData.priority || priority} />
            
            <div className="flex items-center gap-2">
              <PointsBadge points={points} />
            </div>
          </div>
          
          <div className="flex items-start mb-auto">
            <div className="mr-4 flex-shrink-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00f0ff' }}>
                {renderCardIcon()}
              </div>
            </div>
            
            <div className="flex-1 flex flex-col">
              <h3 className="text-xl font-semibold" 
                  style={{ 
                    color: cardData.title_color || '#FFFFFF',
                    backgroundColor: cardData.highlight_effect ? 'rgba(245, 245, 209, 0.7)' : 'transparent',
                    padding: cardData.highlight_effect ? '0 4px' : '0',
                    borderRadius: cardData.highlight_effect ? '4px' : '0'
                  }}>
                {cardData.title}
              </h3>
              
              <p className="text-sm mt-1" 
                 style={{ 
                   color: cardData.subtext_color || '#8E9196',
                   backgroundColor: cardData.highlight_effect ? 'rgba(245, 245, 209, 0.7)' : 'transparent',
                   padding: cardData.highlight_effect ? '0 4px' : '0',
                   borderRadius: cardData.highlight_effect ? '4px' : '0'
                 }}>
                {cardData.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <FrequencyTracker 
              frequency="weekly" 
              frequency_count={2} 
              calendar_color={cardData.calendar_color || '#7E69AB'}
              usage_data={usageData}
            />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenEditModal}
              className="bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
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
