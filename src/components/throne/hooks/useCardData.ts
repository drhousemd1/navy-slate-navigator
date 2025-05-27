
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { ThroneRoomCardData } from '@/components/throne/ThroneRoomEditModal';

interface UseCardDataProps {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

interface UseCardDataResult {
  cardData: ThroneRoomCardData;
  images: string[];
  usageData: number[];
  handleSaveCard: (updatedData: ThroneRoomCardData) => void;
}

export const useCardData = ({
  id,
  title,
  description,
  priority
}: UseCardDataProps): UseCardDataResult => {
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
  const [usageData, setUsageData] = useState<number[]>([1, 0, 1, 0, 0, 0, 0]);

  useEffect(() => {
    const savedCards = JSON.parse(localStorage.getItem('throneRoomCards') || '[]');
    const savedCard = savedCards.find((card: ThroneRoomCardData) => card.id === id);
    
    if (savedCard) {
      console.log("Loading saved card data for", id, savedCard);
      
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
      
      setImages(imageArray);
      
      if (Array.isArray(savedCard.usage_data) && savedCard.usage_data.length > 0) {
        setUsageData(savedCard.usage_data);
      }
    }
  }, [id, title, description, priority]);

  const handleSaveCard = (updatedData: ThroneRoomCardData) => {
    console.log("Saving updated card data:", updatedData);
    
    setCardData(updatedData);
    
    const imageArray = Array.isArray(updatedData.background_images)
      ? updatedData.background_images.filter(Boolean)
      : updatedData.background_image_url
        ? [updatedData.background_image_url]
        : [];
    
    setImages(imageArray);
    
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

  return {
    cardData,
    images,
    usageData,
    handleSaveCard
  };
};
