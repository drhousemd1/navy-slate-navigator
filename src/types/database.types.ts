
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          image_url: string | null
          created_at: string
          updated_at: string
          user_id: string
          points: number
          priority: 'low' | 'medium' | 'high'
          frequency: 'daily' | 'weekly'
          frequency_count: number
          completed: boolean
          last_completed_date: string | null
          usage_data: Json | null
          title_color: string | null
          description_color: string | null
          highlight_effect: boolean
          icon_name: string | null
          icon_color: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
          points?: number
          priority?: 'low' | 'medium' | 'high'
          frequency?: 'daily' | 'weekly'
          frequency_count?: number
          completed?: boolean
          last_completed_date?: string | null
          usage_data?: Json | null
          title_color?: string | null
          description_color?: string | null
          highlight_effect?: boolean
          icon_name?: string | null
          icon_color?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string
          points?: number
          priority?: 'low' | 'medium' | 'high'
          frequency?: 'daily' | 'weekly'
          frequency_count?: number
          completed?: boolean
          last_completed_date?: string | null
          usage_data?: Json | null
          title_color?: string | null
          description_color?: string | null
          highlight_effect?: boolean
          icon_name?: string | null
          icon_color?: string | null
        }
      }
      rewards: {
        Row: {
          id: string
          title: string
          description: string | null
          image_url: string | null
          created_at: string
          updated_at: string
          user_id: string
          cost: number
          supply: number
          title_color: string | null
          description_color: string | null
          highlight_effect: boolean
          icon_name: string | null
          icon_color: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
          cost?: number
          supply?: number
          title_color?: string | null
          description_color?: string | null
          highlight_effect?: boolean
          icon_name?: string | null
          icon_color?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string
          cost?: number
          supply?: number
          title_color?: string | null
          description_color?: string | null
          highlight_effect?: boolean
          icon_name?: string | null
          icon_color?: string | null
        }
      }
      punishments: {
        Row: {
          id: string
          title: string
          description: string | null
          image_url: string | null
          created_at: string
          updated_at: string
          user_id: string
          points: number
          title_color: string | null
          description_color: string | null
          highlight_effect: boolean
          icon_name: string | null
          icon_color: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
          points?: number
          title_color?: string | null
          description_color?: string | null
          highlight_effect?: boolean
          icon_name?: string | null
          icon_color?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string
          points?: number
          title_color?: string | null
          description_color?: string | null
          highlight_effect?: boolean
          icon_name?: string | null
          icon_color?: string | null
        }
      }
      rules: {
        Row: {
          id: string
          title: string
          description: string | null
          image_url: string | null
          created_at: string
          updated_at: string
          user_id: string
          priority: 'low' | 'medium' | 'high'
          frequency: 'daily' | 'weekly'
          frequency_count: number
          usage_data: Json | null
          title_color: string | null
          description_color: string | null
          highlight_effect: boolean
          icon_name: string | null
          icon_color: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
          priority?: 'low' | 'medium' | 'high'
          frequency?: 'daily' | 'weekly'
          frequency_count?: number
          usage_data?: Json | null
          title_color?: string | null
          description_color?: string | null
          highlight_effect?: boolean
          icon_name?: string | null
          icon_color?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string
          priority?: 'low' | 'medium' | 'high'
          frequency?: 'daily' | 'weekly'
          frequency_count?: number
          usage_data?: Json | null
          title_color?: string | null
          description_color?: string | null
          highlight_effect?: boolean
          icon_name?: string | null
          icon_color?: string | null
        }
      }
      task_completions: {
        Row: {
          id: string
          task_id: string
          user_id: string
          completed_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          completed_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          completed_at?: string
        }
      }
      reward_usages: {
        Row: {
          id: string
          reward_id: string
          user_id: string
          used_at: string
          day_of_week: number
          week_number: string
        }
        Insert: {
          id?: string
          reward_id: string
          user_id: string
          used_at?: string
          day_of_week: number
          week_number: string
        }
        Update: {
          id?: string
          reward_id?: string
          user_id?: string
          used_at?: string
          day_of_week?: number
          week_number?: string
        }
      }
      rule_violations: {
        Row: {
          id: string
          rule_id: string
          user_id: string
          violation_date: string
          day_of_week: number
          week_number: string
        }
        Insert: {
          id?: string
          rule_id: string
          user_id: string
          violation_date?: string
          day_of_week: number
          week_number: string
        }
        Update: {
          id?: string
          rule_id?: string
          user_id?: string
          violation_date?: string
          day_of_week?: number
          week_number?: string
        }
      }
      punishment_applications: {
        Row: {
          id: string
          punishment_id: string
          user_id: string
          applied_at: string
          points_deducted: number
          day_of_week: number
        }
        Insert: {
          id?: string
          punishment_id: string
          user_id: string
          applied_at?: string
          points_deducted: number
          day_of_week: number
        }
        Update: {
          id?: string
          punishment_id?: string
          user_id?: string
          applied_at?: string
          points_deducted?: number
          day_of_week?: number
        }
      }
      profiles: {
        Row: {
          id: string
          points: number
          created_at: string
          updated_at: string
          avatar_url: string | null
        }
        Insert: {
          id: string
          points?: number
          created_at?: string
          updated_at?: string
          avatar_url?: string | null
        }
        Update: {
          id?: string
          points?: number
          created_at?: string
          updated_at?: string
          avatar_url?: string | null
        }
      }
    }
  }
}
