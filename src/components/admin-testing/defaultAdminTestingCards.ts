
export interface AdminTestingCardData {
  id: string;
  title: string;
  description: string;
  iconName?: string;
  icon_url?: string;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  background_image_url?: string;
  background_images?: string[];
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  highlight_effect?: boolean;
  priority?: 'low' | 'medium' | 'high';
  points?: number;
  usage_data?: number[];
}

export const defaultAdminTestingCards: AdminTestingCardData[] = [
  {
    id: "admin-card-1",
    title: "Sample Test Card",
    description: "This is a placeholder test card for admin UI development.",
    priority: "medium",
    points: 5,
    usage_data: [2, 4, 1, 3, 0, 1, 2],
    background_opacity: 80
  },
  {
    id: "admin-card-2",
    title: "Behavior Override Check",
    description: "Testing behavior override mechanics and UI placement.",
    priority: "high",
    points: 10,
    usage_data: [1, 1, 3, 4, 2, 0, 1],
    background_opacity: 90
  }
];
