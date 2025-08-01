export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      app_guide_content: {
        Row: {
          content: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      archived_messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      encyclopedia_entries: {
        Row: {
          created_at: string | null
          focal_point_x: number | null
          focal_point_y: number | null
          formatted_sections: Json | null
          highlight_effect: boolean | null
          id: string
          image_meta: Json | null
          image_url: string | null
          opacity: number | null
          popup_opacity: number | null
          popup_text: string | null
          popup_text_formatting: Json | null
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
          formatted_sections?: Json | null
          highlight_effect?: boolean | null
          id?: string
          image_meta?: Json | null
          image_url?: string | null
          opacity?: number | null
          popup_opacity?: number | null
          popup_text?: string | null
          popup_text_formatting?: Json | null
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
          formatted_sections?: Json | null
          highlight_effect?: boolean | null
          id?: string
          image_meta?: Json | null
          image_url?: string | null
          opacity?: number | null
          popup_opacity?: number | null
          popup_text?: string | null
          popup_text_formatting?: Json | null
          subtext?: string
          subtext_color?: string | null
          title?: string
          title_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          dom_points: number | null
          id: string
          linked_partner_id: string | null
          nickname: string | null
          partner_link_code: string | null
          points: number
          push_token: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          dom_points?: number | null
          id: string
          linked_partner_id?: string | null
          nickname?: string | null
          partner_link_code?: string | null
          points?: number
          push_token?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          dom_points?: number | null
          id?: string
          linked_partner_id?: string | null
          nickname?: string | null
          partner_link_code?: string | null
          points?: number
          push_token?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_linked_partner_id_fkey"
            columns: ["linked_partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      punishment_history: {
        Row: {
          applied_date: string | null
          day_of_week: number
          id: string
          points_deducted: number
          punishment_id: string | null
          user_id: string
        }
        Insert: {
          applied_date?: string | null
          day_of_week: number
          id?: string
          points_deducted: number
          punishment_id?: string | null
          user_id: string
        }
        Update: {
          applied_date?: string | null
          day_of_week?: number
          id?: string
          points_deducted?: number
          punishment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "punishment_history_punishment_id_fkey"
            columns: ["punishment_id"]
            isOneToOne: false
            referencedRelation: "punishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punishment_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      punishments: {
        Row: {
          background_image_url: string | null
          background_images: Json | null
          background_opacity: number
          calendar_color: string
          created_at: string | null
          description: string
          dom_points: number
          dom_supply: number
          focal_point_x: number
          focal_point_y: number
          highlight_effect: boolean
          icon_color: string
          icon_name: string | null
          id: string
          image_meta: Json | null
          points: number
          subtext_color: string
          title: string
          title_color: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          background_image_url?: string | null
          background_images?: Json | null
          background_opacity?: number
          calendar_color?: string
          created_at?: string | null
          description?: string
          dom_points?: number
          dom_supply?: number
          focal_point_x?: number
          focal_point_y?: number
          highlight_effect?: boolean
          icon_color?: string
          icon_name?: string | null
          id?: string
          image_meta?: Json | null
          points?: number
          subtext_color?: string
          title: string
          title_color?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          background_image_url?: string | null
          background_images?: Json | null
          background_opacity?: number
          calendar_color?: string
          created_at?: string | null
          description?: string
          dom_points?: number
          dom_supply?: number
          focal_point_x?: number
          focal_point_y?: number
          highlight_effect?: boolean
          icon_color?: string
          icon_name?: string | null
          id?: string
          image_meta?: Json | null
          points?: number
          subtext_color?: string
          title?: string
          title_color?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "punishments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_usage: {
        Row: {
          created_at: string | null
          day_of_week: number
          id: string
          reward_id: string | null
          used: boolean | null
          user_id: string
          week_number: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          id?: string
          reward_id?: string | null
          used?: boolean | null
          user_id: string
          week_number: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          id?: string
          reward_id?: string | null
          used?: boolean | null
          user_id?: string
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
          {
            foreignKeyName: "reward_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          image_meta: Json | null
          is_dom_reward: boolean | null
          subtext_color: string | null
          supply: number
          title: string
          title_color: string | null
          updated_at: string | null
          user_id: string
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
          image_meta?: Json | null
          is_dom_reward?: boolean | null
          subtext_color?: string | null
          supply?: number
          title: string
          title_color?: string | null
          updated_at?: string | null
          user_id: string
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
          image_meta?: Json | null
          is_dom_reward?: boolean | null
          subtext_color?: string | null
          supply?: number
          title?: string
          title_color?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_violations: {
        Row: {
          day_of_week: number
          id: string
          rule_id: string | null
          user_id: string
          violation_date: string
          week_number: string
        }
        Insert: {
          day_of_week: number
          id?: string
          rule_id?: string | null
          user_id: string
          violation_date?: string
          week_number: string
        }
        Update: {
          day_of_week?: number
          id?: string
          rule_id?: string | null
          user_id?: string
          violation_date?: string
          week_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_violations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_violations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rules: {
        Row: {
          background_image_path: string | null
          background_image_url: string | null
          background_images: Json | null
          background_opacity: number
          calendar_color: string
          created_at: string
          description: string | null
          focal_point_x: number
          focal_point_y: number
          frequency: string
          frequency_count: number
          highlight_effect: boolean
          icon_color: string
          icon_name: string | null
          icon_url: string | null
          id: string
          image_meta: Json | null
          priority: string
          subtext_color: string
          title: string
          title_color: string
          updated_at: string
          usage_data: Json | null
          user_id: string
        }
        Insert: {
          background_image_path?: string | null
          background_image_url?: string | null
          background_images?: Json | null
          background_opacity?: number
          calendar_color?: string
          created_at?: string
          description?: string | null
          focal_point_x?: number
          focal_point_y?: number
          frequency?: string
          frequency_count?: number
          highlight_effect?: boolean
          icon_color?: string
          icon_name?: string | null
          icon_url?: string | null
          id?: string
          image_meta?: Json | null
          priority?: string
          subtext_color?: string
          title: string
          title_color?: string
          updated_at?: string
          usage_data?: Json | null
          user_id: string
        }
        Update: {
          background_image_path?: string | null
          background_image_url?: string | null
          background_images?: Json | null
          background_opacity?: number
          calendar_color?: string
          created_at?: string
          description?: string | null
          focal_point_x?: number
          focal_point_y?: number
          frequency?: string
          frequency_count?: number
          highlight_effect?: boolean
          icon_color?: string
          icon_name?: string | null
          icon_url?: string | null
          id?: string
          image_meta?: Json | null
          priority?: string
          subtext_color?: string
          title?: string
          title_color?: string
          updated_at?: string
          usage_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      task_completion_history: {
        Row: {
          completed_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completion_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          background_image_url: string | null
          background_images: Json | null
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
          image_meta: Json | null
          is_dom_task: boolean
          last_completed_date: string | null
          points: number
          priority: string
          subtext_color: string
          title: string
          title_color: string
          updated_at: string
          usage_data: Json | null
          user_id: string
          week_identifier: string | null
        }
        Insert: {
          background_image_url?: string | null
          background_images?: Json | null
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
          image_meta?: Json | null
          is_dom_task?: boolean
          last_completed_date?: string | null
          points?: number
          priority?: string
          subtext_color?: string
          title: string
          title_color?: string
          updated_at?: string
          usage_data?: Json | null
          user_id: string
          week_identifier?: string | null
        }
        Update: {
          background_image_url?: string | null
          background_images?: Json | null
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
          image_meta?: Json | null
          is_dom_task?: boolean
          last_completed_date?: string | null
          points?: number
          priority?: string
          subtext_color?: string
          title?: string
          title_color?: string
          updated_at?: string
          usage_data?: Json | null
          user_id?: string
          week_identifier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_color_schemes: {
        Row: {
          created_at: string
          id: string
          scheme_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          scheme_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          scheme_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          id: string
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wellbeing_snapshots: {
        Row: {
          created_at: string
          id: string
          metrics: Json
          overall_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metrics?: Json
          overall_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: Json
          overall_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wellbeing_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_reminders: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_sent: string | null
          reminder_time: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_sent?: string | null
          reminder_time?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_sent?: string | null
          reminder_time?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wellness_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_notify_user: {
        Args: { sender_id: string; target_id: string }
        Returns: boolean
      }
      delete_user_account: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_linked_partner_id: {
        Args: { user_id_param: string }
        Returns: string
      }
      get_task_completions_for_week: {
        Args: { week_start: string }
        Returns: {
          completion_date: string
          completion_count: number
        }[]
      }
      has_role: {
        Args: {
          requested_user_id: string
          requested_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      record_task_completion: {
        Args: { task_id_param: string; user_id_param: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
