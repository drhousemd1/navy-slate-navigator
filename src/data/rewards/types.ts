
    // Define a robust Json type (can be imported from a shared types file later if needed)
    export type Json =
      | string
      | number
      | boolean
      | null
      | { [key: string]: Json }
      | Json[];

    export interface Reward {
      id: string;
      title: string;
      description?: string | null;
      cost: number;
      supply: number;
      background_image_url?: string | null;
      background_opacity: number;
      icon_name?: string | null;
      icon_url?: string | null;
      icon_color: string;
      title_color: string;
      subtext_color: string;
      calendar_color: string;
      highlight_effect: boolean;
      focal_point_x: number;
      focal_point_y: number;
      is_dom_reward: boolean;
      image_meta?: Json | null;
      created_at?: string;
      updated_at?: string;
    }

    // Used for optimistic updates
    export type RewardWithId = Reward & { id: string };

    // Define the form values interface for reward forms
    export interface RewardFormValues {
      title: string;
      description: string;
      cost: number;
      supply: number;
      is_dom_reward: boolean;
      icon_name: string | null; // Allow null for icon_name
      icon_color: string;
      title_color: string;
      subtext_color: string;
      calendar_color: string;
      highlight_effect: boolean;
      background_image_url: string | null; // Allow null for background_image_url
      background_opacity: number;
      focal_point_x: number;
      focal_point_y: number;
      image_meta?: Json | null;
    }
    
    // Align this with the type in useSaveReward.ts by making all fields from Reward present and required
    export type CreateRewardVariables = {
      title: string;
      cost: number;
      supply: number;
      is_dom_reward: boolean;
      description?: string | null;
      background_image_url?: string | null;
      background_opacity: number;
      icon_name?: string | null;
      icon_url?: string | null;
      icon_color: string;
      title_color: string;
      subtext_color: string;
      calendar_color: string;
      highlight_effect: boolean;
      focal_point_x: number;
      focal_point_y: number;
      image_meta?: Json | null;
    };

    export type UpdateRewardVariables = { id: string } & Partial<Omit<Reward, 'id' | 'created_at' | 'updated_at'>>;
