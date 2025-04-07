
import { useState, useEffect } from 'react';
import { AdminTestingCardData } from '../defaultAdminTestingCards';
import { supabase } from '@/integrations/supabase/client';
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
}

interface UseAdminCardDataResult {
  cardData: AdminTestingCardData;
  images: string[];
  usageData: number[];
  handleSaveCard: (updatedCard: AdminTestingCardData) => void;
}

// Helper type to handle Supabase data conversion
interface SupabaseCardData {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  points?: number;  // Add points as optional to match Supabase schema
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCardData = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('admin_testing_cards')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          if (error.code !== 'PGRST116') { // Not found is not a critical error
            console.error('Error fetching card data:', error);
          }
          // If not found in Supabase, use the default state
          return;
        }
        
        if (data) {
          // Cast data to our helper type to handle type conversions
          const supabaseData = data as SupabaseCardData;
          
          // Transform data from Supabase to match our expected format
          const savedCard = {
            ...data,
            // Ensure points is a number with fallback to default
            points: typeof supabaseData.points === 'number' ? supabaseData.points : 5,
            priority: (supabaseData.priority as 'low' | 'medium' | 'high') || 'medium',
            background_images: supabaseData.background_images || [],
            usage_data: supabaseData.usage_data || [1, 2, 0, 3, 1, 0, 2]
          };
          
          setCardData({
            ...cardData,
            ...savedCard
          });
          
          // Set images from background_images or single background_image_url
          let imageArray: string[] = [];
          if (Array.isArray(savedCard.background_images)) {
            imageArray = savedCard.background_images.filter(img => typeof img === 'string') as string[];
          } else if (typeof savedCard.background_images === 'object' && savedCard.background_images !== null) {
            // Try to convert JSON object to array if possible
            const bgImages = (savedCard.background_images as unknown) as Json[];
            if (Array.isArray(bgImages)) {
              imageArray = bgImages.filter(item => typeof item === 'string') as string[];
            }
          }
          
          if (imageArray.length === 0 && savedCard.background_image_url) {
            imageArray = [savedCard.background_image_url];
          }
              
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
    // Initialize images array from props if not loaded from Supabase
    if (!isLoading && images.length === 0) {
      const initialImages: string[] = [];
      
      if (background_images && background_images.length > 0) {
        initialImages.push(...background_images.filter(Boolean));
      } else if (background_image_url) {
        initialImages.push(background_image_url);
      }
      
      setImages(initialImages);
    }
  }, [isLoading, background_images, background_image_url, images.length]);

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
      
      // Save to Supabase using upsert
      const { error } = await supabase
        .from('admin_testing_cards')
        .upsert({
          ...newCardData,
          // Explicitly add points to ensure it's included in the upsert
          points: newCardData.points || 0
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
