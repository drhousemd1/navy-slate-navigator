
import { useState, useEffect } from 'react';
import { AdminTestingCardData } from '../defaultAdminTestingCards';
import { updateCard } from '@/data/hooks/useAdminCards';

interface UseAdminCardDataProps {
  id: string;
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  points?: number;
  icon_url?: string;
  icon_name?: string;
  background_images?: string[];
  background_image_url?: string;
}

interface UseAdminCardDataResult {
  cardData: AdminTestingCardData;
  images: string[];
  usageData: number[];
  handleSaveCard: (updatedCard: AdminTestingCardData) => void;
}

// This is now a lightweight component wrapper around the central data hook
// It maintains backward compatibility while delegating data operations to the central system
export const useAdminCardData = ({
  id,
  title,
  description,
  priority = 'medium',
  points = 0,
  icon_url,
  icon_name,
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
    icon_name,
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
    // Initialize images array from props
    const initialImages: string[] = [];
    
    if (background_images && background_images.length > 0) {
      initialImages.push(...background_images.filter(Boolean));
    } else if (background_image_url) {
      initialImages.push(background_image_url);
    }
    
    if (initialImages.length > 0) {
      console.log("Initializing images from props:", initialImages);
      setImages(initialImages);
    }
  }, [background_images, background_image_url]);

  const handleSaveCard = async (updatedCard: AdminTestingCardData) => {
    try {
      // Make sure we have the complete updated data
      const newCardData = {
        ...cardData,
        ...updatedCard
      };
      
      setCardData(newCardData);
      
      // Update images array based on updated card data
      let newImages: string[] = [];
      
      if (Array.isArray(updatedCard.background_images)) {
        newImages = updatedCard.background_images.filter(img => typeof img === 'string') as string[];
      } else if (updatedCard.background_image_url) {
        newImages = [updatedCard.background_image_url];
      }
      
      setImages(newImages);
      
      // Use the central data service to update the card
      await updateCard(newCardData);
    } catch (error) {
      console.error('Error in handleSaveCard:', error);
    }
  };

  // Ensure usageData is always an array of numbers
  const usageData = Array.isArray(cardData.usage_data) 
    ? cardData.usage_data as number[]
    : typeof cardData.usage_data === 'object' && cardData.usage_data !== null
      ? Object.values(cardData.usage_data).map(val => 
          typeof val === 'number' ? val : 0
        ) 
      : [0, 0, 0, 0, 0, 0, 0];

  return {
    cardData,
    images,
    usageData,
    handleSaveCard
  };
};
