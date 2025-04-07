
import { ReactNode } from 'react';

export interface AdminTestingCardData {
  id: string;
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  points?: number;
  icon?: ReactNode;
  icon_url?: string;
  iconName?: string;
  icon_color?: string;
  background_image_url?: string;
  background_images?: string[];
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  usage_data?: number[];
}

// Default cards - will be replaced by user-created ones in localStorage
export const defaultAdminTestingCards: AdminTestingCardData[] = [
  {
    id: "admin-card-1",
    title: "Testing Panel",
    description: "Configure and test admin functionality.",
    priority: "medium",
    points: 5,
    background_opacity: 80,
    title_color: '#FFFFFF',
    subtext_color: '#8E9196',
    calendar_color: '#7E69AB',
    icon_color: '#FFFFFF',
    focal_point_x: 50,
    focal_point_y: 50,
    highlight_effect: false,
    usage_data: [1, 2, 0, 3, 1, 0, 2]
  }
];
