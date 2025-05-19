// Update or add the Rule interface definition that matches with what's used in your app
export interface Rule {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  frequency: string;
  frequency_count: number;
  icon_name?: string;
  icon_color: string;
  icon_url?: string;
  background_image_url?: string;
  background_opacity: number;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  created_at: string;
  updated_at: string;
  user_id?: string;
  background_images?: any;
  background_image_path?: string;
  usage_data?: any[];
}
