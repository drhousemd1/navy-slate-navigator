
import { Skull, Crown, Swords, Award } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

export interface AdminTestingCardData {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  points: number;
  background_image_url?: string | null;
  background_images?: string[] | Json;
  background_opacity: number;
  focal_point_x: number;
  focal_point_y: number;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_url?: string | null;
  icon_name?: string;
  icon_color: string;
  highlight_effect: boolean;
  usage_data: number[] | Json;
  created_at?: string;
  updated_at?: string;
  user_id?: string | null;
}

export const defaultAdminTestingCards: AdminTestingCardData[] = [
  {
    id: "royal-duty",
    title: "Royal Duty",
    description: "Complete daily tasks before sunset.",
    priority: "medium",
    points: 5,
    background_opacity: 80,
    focal_point_x: 50,
    focal_point_y: 50,
    title_color: '#FFFFFF',
    subtext_color: '#8E9196',
    calendar_color: '#7E69AB',
    icon_color: '#FFFFFF',
    highlight_effect: false,
    usage_data: [1, 2, 0, 3, 1, 0, 2]
  },
  {
    id: "kingdom-status",
    title: "Kingdom Status",
    description: "Monitor your kingdom's prosperity.",
    priority: "high",
    points: 10,
    background_opacity: 80,
    focal_point_x: 50,
    focal_point_y: 50,
    title_color: '#FFFFFF',
    subtext_color: '#8E9196',
    calendar_color: '#7E69AB',
    icon_color: '#FFFFFF',
    highlight_effect: false,
    usage_data: [2, 3, 1, 4, 2, 0, 3]
  }
];
