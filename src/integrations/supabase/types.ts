export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      encyclopedia_entries: {
        Row: {
          created_at: string | null
          focal_point_x: number | null
          focal_point_y: number | null
          highlight_effect: boolean | null
          id: string
          image_url: string | null
          opacity: number | null
          popup_text: string | null
          subtext: string
          subtext_color: string | null
          title: string
          title_color: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          focal_point_x?: number | null
          focal_point_y?: number | null
          highlight_effect?: boolean | null
          id?: string
          image_url?: string | null
          opacity?: number | null
          popup_text?: string | null
          subtext: string
          subtext_color?: string | null
          title: string
          title_color?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          focal_point_x?: number | null
          focal_point_y?: number | null
          highlight_effect?: boolean | null
          id?: string
          image_url?: string | null
          opacity?: number | null
          popup_text?: string | null
          subtext?: string
          subtext_color?: string | null
          title?: string
          title_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          updated_at?: string
        }
        Relationships: []
      }
      punishment_history: {
        Row: {
          applied_date: string | null
          day_of_week: number
          id: string
          points_deducted: number
          punishment_id: string | null
        }
        Insert: {
          applied_date?: string | null
          day_of_week: number
          id?: string
          points_deducted: number
          punishment_id?: string | null
        }
        Update: {
          applied_date?: string | null
          day_of_week?: number
          id?: string
          points_deducted?: number
          punishment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punishment_history_punishment_id_fkey"
            columns: ["punishment_id"]
            isOneToOne: false
            referencedRelation: "punishments"
            referencedColumns: ["id"]
          },
        ]
      }
      punishments: {
        Row: {
          background_image_url: string | null
          background_opacity: number | null
          calendar_color: string | null
          created_at: string | null
          description: string | null
          focal_point_x: number | null
          focal_point_y: number | null
          highlight_effect: boolean | null
          icon_color: string | null
          icon_name: string | null
          id: string
          points: number
          subtext_color: string | null
          title: string
          title_color: string | null
          updated_at: string | null
        }
        Insert: {
          background_image_url?: string | null
          background_opacity?: number | null
          calendar_color?: string | null
          created_at?: string | null
          description?: string | null
          focal_point_x?: number | null
          focal_point_y?: number | null
          highlight_effect?: boolean | null
          icon_color?: string | null
          icon_name?: string | null
          id?: string
          points?: number
          subtext_color?: string | null
          title: string
          title_color?: string | null
          updated_at?: string | null
        }
        Update: {
          background_image_url?: string | null
          background_opacity?: number | null
          calendar_color?: string | null
          created_at?: string | null
          description?: string | null
          focal_point_x?: number | null
          focal_point_y?: number | null
          highlight_effect?: boolean | null
          icon_color?: string | null
          icon_name?: string | null
          id?: string
          points?: number
          subtext_color?: string | null
          title?: string
          title_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reward_usage: {
        Row: {
          created_at: string | null
          day_of_week: number
          id: string
          reward_id: string | null
          used: boolean | null
          week_number: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          id?: string
          reward_id?: string | null
          used?: boolean | null
          week_number: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          id?: string
          reward_id?: string | null
          used?: boolean | null
          week_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_usage_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          background_image_url: string | null
          background_opacity: number | null
          calendar_color: string | null
          cost: number
          created_at: string | null
          description: string | null
          focal_point_x: number | null
          focal_point_y: number | null
          highlight_effect: boolean | null
          icon_color: string | null
          icon_name: string | null
          id: string
          subtext_color: string | null
          supply: number
          title: string
          title_color: string | null
          updated_at: string | null
        }
        Insert: {
          background_image_url?: string | null
          background_opacity?: number | null
          calendar_color?: string | null
          cost?: number
          created_at?: string | null
          description?: string | null
          focal_point_x?: number | null
          focal_point_y?: number | null
          highlight_effect?: boolean | null
          icon_color?: string | null
          icon_name?: string | null
          id?: string
          subtext_color?: string | null
          supply?: number
          title: string
          title_color?: string | null
          updated_at?: string | null
        }
        Update: {
          background_image_url?: string | null
          background_opacity?: number | null
          calendar_color?: string | null
          cost?: number
          created_at?: string | null
          description?: string | null
          focal_point_x?: number | null
          focal_point_y?: number | null
          highlight_effect?: boolean | null
          icon_color?: string | null
          icon_name?: string | null
          id?: string
          subtext_color?: string | null
          supply?: number
          title?: string
          title_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          background_image_url: string | null
          background_opacity: number
          calendar_color: string
          completed: boolean
          created_at: string
          description: string | null
          focal_point_x: number | null
          focal_point_y: number | null
          frequency: string
          frequency_count: number
          highlight_effect: boolean
          icon_color: string
          icon_name: string | null
          icon_url: string | null
          id: string
          last_completed_date: string | null
          points: number
          priority: string
          subtext_color: string
          title: string
          title_color: string
          updated_at: string
        }
        Insert: {
          background_image_url?: string | null
          background_opacity?: number
          calendar_color?: string
          completed?: boolean
          created_at?: string
          description?: string | null
          focal_point_x?: number | null
          focal_point_y?: number | null
          frequency?: string
          frequency_count?: number
          highlight_effect?: boolean
          icon_color?: string
          icon_name?: string | null
          icon_url?: string | null
          id?: string
          last_completed_date?: string | null
          points?: number
          priority?: string
          subtext_color?: string
          title: string
          title_color?: string
          updated_at?: string
        }
        Update: {
          background_image_url?: string | null
          background_opacity?: number
          calendar_color?: string
          completed?: boolean
          created_at?: string
          description?: string | null
          focal_point_x?: number | null
          focal_point_y?: number | null
          frequency?: string
          frequency_count?: number
          highlight_effect?: boolean
          icon_color?: string
          icon_name?: string | null
          icon_url?: string | null
          id?: string
          last_completed_date?: string | null
          points?: number
          priority?: string
          subtext_color?: string
          title?: string
          title_color?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
