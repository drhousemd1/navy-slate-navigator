
import { useState, useEffect } from 'react';
import { AdminTestingCardData } from '../defaultAdminTestingCards';

interface UseAdminCardDataProps {
  id: string;
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  points?: number;
  icon_url?: string;
  iconName?: string;
  background_images?: string[];
  background_image_url?: string;
}

interface UseAdminCardDataResult {
  cardData: AdminTestingCardData;
  images: string[];
  usageData: number[];
  handleSaveCard: (updatedCard: AdminTestingCardData) => void;
}

export const useAdminCardData = ({
  id,
  title,
  description,
  priority = 'medium',
  points = 0,
  icon_url,
  iconName,
  background_images = [],
  background_image_url
}: UseAdminCardDataProps): UseAdminCardDataResult => {
  const [cardData, setCardData] = useState<AdminTestingCardData>({
    id,
    title,
    description,
    priority,
    points,
    icon_url,
    iconName,
    background_image_url,
    background_images: background_images,
    background_opacity: 80,
    focal_point_x: 50,
    focal_point_y: 50,
    title_color: '#FFFFFF',
    subtext_color: '#8E9196',
    calendar_color: '#7E69AB',
    icon_color: '#FFFFFF',
    highlight_effect: false,
    usage_data: [1, 2, 0, 3, 1, 0, 2]
  });

  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    // Try to load saved card data from localStorage
    const savedCards = JSON.parse(localStorage.getItem('adminTestingCards') || '[]');
    const savedCard = savedCards.find((card: AdminTestingCardData) => card.id === id);
    
    if (savedCard) {
      setCardData({
        ...cardData,
        ...savedCard
      });
      
      // Set images from background_images or single background_image_url
      const imageArray = Array.isArray(savedCard.background_images) && savedCard.background_images.length > 0
        ? savedCard.background_images.filter(Boolean)
        : savedCard.background_image_url
          ? [savedCard.background_image_url]
          : [];
          
      setImages(imageArray);
    } else {
      // Initialize images array from props
      const initialImages: string[] = [];
      
      if (background_images && background_images.length > 0) {
        initialImages.push(...background_images.filter(Boolean));
      } else if (background_image_url) {
        initialImages.push(background_image_url);
      }
      
      setImages(initialImages);
    }
  }, [id]);

  const handleSaveCard = (updatedCard: AdminTestingCardData) => {
    // Make sure we have the complete updated data
    const newCardData = {
      ...cardData,
      ...updatedCard
    };
    
    setCardData(newCardData);
    
    // Update images array based on updated card data
    let newImages: string[] = [];
    
    if (Array.isArray(updatedCard.background_images) && updatedCard.background_images.length > 0) {
      newImages = updatedCard.background_images.filter(Boolean);
    } else if (updatedCard.background_image_url) {
      newImages = [updatedCard.background_image_url];
    }
    
    setImages(newImages);
    
    // Save to localStorage
    const savedCards = JSON.parse(localStorage.getItem('adminTestingCards') || '[]');
    const cardIndex = savedCards.findIndex((card: AdminTestingCardData) => card.id === id);
    
    if (cardIndex >= 0) {
      savedCards[cardIndex] = newCardData;
    } else {
      savedCards.push(newCardData);
    }
    
    localStorage.setItem('adminTestingCards', JSON.stringify(savedCards));
  };

  const usageData = cardData.usage_data || [0, 0, 0, 0, 0, 0, 0];

  return {
    cardData,
    images,
    usageData,
    handleSaveCard
  };
};
