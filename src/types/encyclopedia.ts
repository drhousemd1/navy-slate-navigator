
export interface EncyclopediaEntry {
  id: string;
  title: string;
  subtext: string;
  popup_text: string;
  image_url?: string | null;
  focal_point_x?: number;
  focal_point_y?: number;
  opacity?: number;
  popup_opacity?: number;
  title_color?: string;
  subtext_color?: string;
  highlight_effect?: boolean;
  popup_text_formatting?: {
    isBold?: boolean;
    isUnderlined?: boolean;
    fontSize?: string;
  };
  formatted_sections?: Array<{
    start: number;
    end: number;
    formatting: {
      isBold?: boolean;
      isUnderlined?: boolean;
      fontSize?: string;
    }
  }>;
}
