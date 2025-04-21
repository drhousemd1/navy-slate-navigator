import { Skull, Crown, Swords, Award } from 'lucide-react';

export interface AdminTestingCardData {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  points: number;
  background_image_url?: string;
  background_opacity: number;
  focal_point_x: number;
  focal_point_y: number;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_url?: string;
  icon_name?: string;
  icon_color: string;
  highlight_effect: boolean;
  usage_data: number[];
  background_images: string[];
  order?: number;
}

// Keep this array as a placeholder
export const defaultAdminTestingCards: AdminTestingCardData[] = [];
