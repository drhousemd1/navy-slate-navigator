
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { Json } from '@/integrations/supabase/types';

export interface RuleCardData {
  id: string;
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  points?: number;
  icon_url?: string;
  icon_name?: string;
  background_image_url?: string;
  background_images?: string[];
  background_opacity: number;
  focal_point_x: number;
  focal_point_y: number;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  usage_data?: number[];
  frequency?: 'daily' | 'weekly';
  frequency_count?: number;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

interface UseRuleCardDataProps {
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

interface UseRuleCardDataResult {
  cardData: RuleCardData;
  images: string[];
  usageData: number[];
  handleSaveCard: (updatedCard: RuleCardData) => void;
}

// Helper type to handle Supabase data conversion
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
  frequency: string | null;
  frequency_count: number | null;
}

// Helper function to safely convert Json array to string array
const jsonToStringArray = (jsonValue: Json | null): string[] => {
  if (!jsonValue) return [];
  
  // If it's already an array, filter out non-string values and convert to strings
  if (Array.isArray(jsonValue)) {
    return jsonValue
      .filter(item => item !== null && item !== undefined)
      .map(item => String(item));
  }
  
  // If it's an object with numeric keys, try to convert it to an array
  if (typeof jsonValue === 'object' && jsonValue !== null) {
    try {
      const values = Object.values(jsonValue);
      return values
        .filter(item => item !== null && item !== undefined)
        .map(item => String(item));
    } catch (e) {
      console.error('Error converting Json object to string array:', e);
    }
  }
  
  return [];
};

// Helper function to safely convert Json array to number array
const jsonToNumberArray = (jsonValue: Json | null): number[] => {
  if (!jsonValue) return [];
  
  // If it's already an array, filter out non-number values and convert to numbers
  if (Array.isArray(jsonValue)) {
    return jsonValue
      .filter(item => item !== null && item !== undefined)
      .map(item => {
        const num = Number(item);
        return isNaN(num) ? 0 : num;
      });
  }
  
  // If it's an object with numeric keys, try to convert it to an array
  if (typeof jsonValue === 'object' && jsonValue !== null) {
    try {
      const values = Object.values(jsonValue);
      return values
        .filter(item => item !== null && item !== undefined)
        .map(item => {
          const num = Number(item);
          return isNaN(num) ? 0 : num;
        });
    } catch (e) {
      console.error('Error converting Json object to number array:', e);
    }
  }
  
  return [];
};

export const useRuleCardData = ({
  id,
  title,
  description,
  priority = 'medium',
  points = 0,
  icon_url,
  icon_name,
  background_images = [],
  background_image_url
}: UseRuleCardDataProps): UseRuleCardDataResult => {
  const [cardData, setCardData] = useState<RuleCardData>({
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
        console.log("Fetching rule data with ID:", id);
        
        const { data, error } = await supabase
          .from('rules')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          if (error.code !== 'PGRST116') { // Not found is not a critical error
            console.error('Error fetching rule data:', error);
          } else {
            console.log("Rule not found in database, using default values");
          }
          // If not found in Supabase, use the default state
          return;
        }
        
        if (data) {
          console.log("Rule data retrieved from Supabase:", data);
          
          // Cast data to our helper type to handle type conversions
          const supabaseData = data as SupabaseCardData;
          
          // Transform data from Supabase to match our expected format
          const savedCard: RuleCardData = {
            id: supabaseData.id,
            title: supabaseData.title,
            description: supabaseData.description || '',
            points: typeof supabaseData.points === 'number' ? supabaseData.points : 5,
            priority: (supabaseData.priority as 'low' | 'medium' | 'high') || 'medium',
            background_image_url: supabaseData.background_image_url || undefined,
            background_images: jsonToStringArray(supabaseData.background_images),
            background_opacity: supabaseData.background_opacity || 80,
            focal_point_x: supabaseData.focal_point_x || 50,
            focal_point_y: supabaseData.focal_point_y || 50,
            title_color: supabaseData.title_color || '#FFFFFF',
            subtext_color: supabaseData.subtext_color || '#8E9196',
            calendar_color: supabaseData.calendar_color || '#7E69AB',
            icon_url: supabaseData.icon_url || undefined,
            icon_name: supabaseData.icon_name || undefined,
            icon_color: supabaseData.icon_color || '#FFFFFF',
            highlight_effect: supabaseData.highlight_effect || false,
            usage_data: jsonToNumberArray(supabaseData.usage_data),
            frequency: (supabaseData.frequency as 'daily' | 'weekly') || 'daily',
            frequency_count: supabaseData.frequency_count || 1,
            created_at: supabaseData.created_at || undefined,
            updated_at: supabaseData.updated_at || undefined,
            user_id: supabaseData.user_id || undefined
          };
          
          console.log("Transformed rule data:", savedCard);
          
          setCardData(savedCard);
          
          // Set images from background_images or single background_image_url
          let imageArray = jsonToStringArray(supabaseData.background_images);
          
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
    // Initialize images array from props if not loaded from Supabase
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

  const handleSaveCard = async (updatedCard: RuleCardData) => {
    try {
      console.log("Saving rule to Supabase:", updatedCard);
      
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
        .from('rules')
        .upsert({
          ...newCardData,
          // Explicitly add points to ensure it's included in the upsert
          points: typeof newCardData.points === 'number' ? newCardData.points : 0
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error('Error saving rule to Supabase:', error);
        toast({
          title: "Error",
          description: `Failed to save rule: ${error.message}`,
          variant: "destructive"
        });
        return;
      }
      
      console.log("Rule saved successfully");
      toast({
        title: "Success",
        description: "Rule saved successfully",
      });
    } catch (error) {
      console.error('Error in handleSaveCard:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving the rule",
        variant: "destructive"
      });
    }
  };

  // Ensure usageData is always an array of numbers
  const usageData = Array.isArray(cardData.usage_data) 
    ? cardData.usage_data as number[]
    : [0, 0, 0, 0, 0, 0, 0];

  return {
    cardData,
    images,
    usageData,
    handleSaveCard
  };
};
