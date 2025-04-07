
export interface AdminTestingCardData {
  id: string;
  title: string;
  description: string;
  iconName: string;
  icon_url?: string;
  icon_color: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  background_image_url?: string;
  background_images?: string[];
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  highlight_effect: boolean;
  priority: 'low' | 'medium' | 'high';
  usage_data?: number[];
}
