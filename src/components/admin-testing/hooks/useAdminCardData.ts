import { useState, useEffect } from 'react';
import { AdminTestingCardData } from '../defaultAdminTestingCards';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { Json } from '@/integrations/supabase/types';

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
  order?: number;
}

interface UseAdminCardDataResult {
  cardData: AdminTestingCardData;
  images: string[];
  usageData: number[];
  handleSaveCard: (updatedCard: AdminTestingCardData) => void;
}

interface SupabaseCardData {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  points: number | null;
  background_image_url: string | null;
  background_images: Json | null;
  background_opacity: number | null;
  focal_point_x: number | null;
  focal_point_y: number | null;
  title_color: string | null;
  subtext_color: string | null;
  calendar_color: string | null;
  icon_url: string | null;
  icon_name: string | null;
  icon_color: string | null;
  highlight_effect: boolean | null;
  usage_data: Json | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
  order: number | null;
}

export const useAdminCardData = ({
  id,
  title,
  description,
  priority = 'medium',
  points = 0,
  icon_url,
  icon_name,
  background_images = [],
  background_image_url,
  order = 0
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
    usage_data: [1, 2, 0, 3, 1, 0, 2],
    order
  });

  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCardData = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching card data with ID:", id);

        const supabase = getSupabaseClient();

        const { data, error } = await supabase
          .from('admin_testing_cards')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') {
            console.error('Error fetching card data:', error);
          } else {
            console.log("Card not found in database, using default values");
          }
          return;
        }
        
        if (data) {
          console.log("Card data retrieved from Supabase:", data);
          
          const supabaseData = data as SupabaseCardData;
          
          let usageDataArray: number[] = [1, 2, 0, 3, 1, 0, 2];
          
          if (supabaseData.usage_data) {
            if (Array.isArray(supabaseData.usage_data)) {
              usageDataArray = supabaseData.usage_data.map(item => 
                typeof item === 'number' ? item : 0
              );
            } else if (typeof supabaseData.usage_data === 'object') {
              usageDataArray = Object.values(supabaseData.usage_data as Record<string, unknown>)
                .map(value => typeof value === 'number' ? value : 0);
            }
          }
          
          let backgroundImagesArray: string[] = [];
          if (Array.isArray(supabaseData.background_images)) {
            backgroundImagesArray = supabaseData.background_images
              .filter(img => typeof img === 'string') as string[];
          }
          
          const transformedData: AdminTestingCardData = {
            id: supabaseData.id,
            title: supabaseData.title,
            description: supabaseData.description || '',
            priority: (supabaseData.priority as 'low' | 'medium' | 'high') || 'medium',
            points: typeof supabaseData.points === 'number' ? supabaseData.points : 5,
            background_image_url: supabaseData.background_image_url,
            background_images: backgroundImagesArray,
            background_opacity: supabaseData.background_opacity || 80,
            focal_point_x: supabaseData.focal_point_x || 50,
            focal_point_y: supabaseData.focal_point_y || 50,
            title_color: supabaseData.title_color || '#FFFFFF',
            subtext_color: supabaseData.subtext_color || '#8E9196',
            calendar_color: supabaseData.calendar_color || '#7E69AB',
            icon_url: supabaseData.icon_url,
            icon_name: supabaseData.icon_name || '',
            icon_color: supabaseData.icon_color || '#FFFFFF',
            highlight_effect: supabaseData.highlight_effect || false,
            usage_data: usageDataArray,
            order: supabaseData.order || 0
          };
          
          console.log("Transformed card data:", transformedData);
          
          setCardData(transformedData);
          
          let imageArray: string[] = backgroundImagesArray;
          
          if (imageArray.length === 0 && supabaseData.background_image_url) {
            imageArray = [supabaseData.background_image_url];
          }
          
          console.log("Setting images array:", imageArray);
          setImages(imageArray);
        }
      } catch (error) {
        console.error('Error in fetchCardData:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCardData();
  }, [id]);

  useEffect(() => {
    if (!isLoading && images.length === 0) {
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
    }
  }, [isLoading, background_images, background_image_url, images.length]);

  const handleSaveCard = async (updatedCard: AdminTestingCardData) => {
    try {
      console.log("Saving card to Supabase:", updatedCard);
      
      const newCardData = {
        ...cardData,
        ...updatedCard
      };
      
      setCardData(newCardData);
      
      let newImages: string[] = [];
      
      if (Array.isArray(updatedCard.background_images)) {
        newImages = updatedCard.background_images.filter(img => typeof img === 'string') as string[];
      } else if (updatedCard.background_image_url) {
        newImages = [updatedCard.background_image_url];
      }
      
      setImages(newImages);
      
      const { error } = await supabase
        .from('admin_testing_cards')
        .upsert({
          ...newCardData,
          points: typeof newCardData.points === 'number' ? newCardData.points : 0,
          order: typeof newCardData.order === 'number' ? newCardData.order : 0
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error('Error saving card to Supabase:', error);
        toast({
          title: "Error",
          description: `Failed to save card: ${error.message}`,
          variant: "destructive"
        });
        return;
      }
      
      console.log("Card saved successfully");
      toast({
        title: "Success",
        description: "Card saved successfully",
      });
    } catch (error) {
      console.error('Error in handleSaveCard:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving the card",
        variant: "destructive"
      });
    }
  };

  const usageData = Array.isArray(cardData.usage_data) 
    ? cardData.usage_data 
    : [0, 0, 0, 0, 0, 0, 0];

  return {
    cardData,
    images,
    usageData,
    handleSaveCard
  };
};
