
export interface EncyclopediaEntry {
  id: string;
  title: string;
  subtext: string;
  popup_text?: string;
  image_url?: string | null;
  focal_point_x: number;
  focal_point_y: number;
  opacity: number;
  popup_opacity?: number; // Field for popup view opacity
  title_color: string;
  subtext_color: string;
  highlight_effect: boolean;
  popup_text_formatting?: {
    isBold?: boolean;
    isUnderlined?: boolean;
    fontSize?: string;
  };
  created_at?: string;
  updated_at?: string;
}
