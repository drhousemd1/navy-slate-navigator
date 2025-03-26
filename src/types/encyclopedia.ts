
export interface EncyclopediaEntry {
  id: string;
  title: string;
  subtext: string;
  popup_text?: string;
  image_url?: string | null;
  focal_point_x: number;
  focal_point_y: number;
  opacity: number;
  title_color: string;
  subtext_color: string;
  highlight_effect: boolean;
  created_at?: string;
  updated_at?: string;
}
