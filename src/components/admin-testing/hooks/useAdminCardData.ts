
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
    const storageKey = `adminTestingCard_${id}`;
    const savedCardData = localStorage.getItem(storageKey);
    
    if (savedCardData) {
      try {
        const parsedData = JSON.parse(savedCardData);
        console.log("Loaded saved card data:", {
          id: parsedData.id,
          hasBackgroundImages: Array.isArray(parsedData.background_images),
          backgroundImagesCount: Array.isArray(parsedData.background_images) ? parsedData.background_images.length : 0,
          hasBackgroundImageUrl: Boolean(parsedData.background_image_url)
        });
        
        setCardData({
          ...cardData,
          ...parsedData
        });
        
        // Set images from background_images or single background_image_url
        if (Array.isArray(parsedData.background_images) && parsedData.background_images.length > 0) {
          console.log("Setting images from background_images:", parsedData.background_images.length);
          setImages(parsedData.background_images.filter(Boolean));
        } else if (parsedData.background_image_url) {
          console.log("Setting single image from background_image_url");
          setImages([parsedData.background_image_url]);
        } else {
          console.log("No images found in saved data");
          setImages([]);
        }
      } catch (error) {
        console.error('Error parsing saved card data:', error);
      }
    } else {
      // Initialize images array from props
      const initialImages: string[] = [];
      
      if (background_images && background_images.length > 0) {
        initialImages.push(...background_images.filter(Boolean));
      } else if (background_image_url) {
        initialImages.push(background_image_url);
      }
      
      console.log("Initial images set from props:", initialImages.length);
      setImages(initialImages);
    }
  }, [id]);

  const handleSaveCard = (updatedCard: AdminTestingCardData) => {
    console.log("Saving card data:", {
      id: updatedCard.id,
      hasBackgroundImageUrl: Boolean(updatedCard.background_image_url),
      hasBackgroundImages: Array.isArray(updatedCard.background_images) && updatedCard.background_images.length > 0,
      imagePreview: updatedCard.background_image_url ? updatedCard.background_image_url.substring(0, 30) + '...' : 'none'
    });
    
    // Make sure we have the complete updated data
    const newCardData = {
      ...cardData,
      ...updatedCard
    };
    
    setCardData(newCardData);
    
    // Update images array based on updated card data
    let newImages: string[] = [];
    
    if (Array.isArray(updatedCard.background_images) && updatedCard.background_images.length > 0) {
      console.log("Setting images from updated background_images array:", updatedCard.background_images.length);
      newImages = updatedCard.background_images.filter(Boolean);
    } else if (updatedCard.background_image_url) {
      console.log("Setting single image from updated background_image_url");
      newImages = [updatedCard.background_image_url];
    }
    
    console.log("Updated images array:", newImages.length > 0 ? `${newImages.length} images` : "empty");
    setImages(newImages);
    
    // Save to localStorage
    const storageKey = `adminTestingCard_${id}`;
    localStorage.setItem(storageKey, JSON.stringify(newCardData));
    console.log(`Saved card data to localStorage with key: ${storageKey}`);
  };

  const usageData = cardData.usage_data || [0, 0, 0, 0, 0, 0, 0];

  return {
    cardData,
    images,
    usageData,
    handleSaveCard
  };
};
