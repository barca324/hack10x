export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      allowed_users: {
        Row: {
          added_on: string
          designation: string | null
          email: string
          id: string
          is_active: boolean
          level_code: Database["public"]["Enums"]["engineering_level"] | null
          name: string
          roles_managing: string[] | null
          user_id: string | null
        }
        Insert: {
          added_on?: string
          designation?: string | null
          email: string
          id?: string
          is_active?: boolean
          level_code?: Database["public"]["Enums"]["engineering_level"] | null
          name: string
          roles_managing?: string[] | null
          user_id?: string | null
        }
        Update: {
          added_on?: string
          designation?: string | null
          email?: string
          id?: string
          is_active?: boolean
          level_code?: Database["public"]["Enums"]["engineering_level"] | null
          name?: string
          roles_managing?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      availability_log: {
        Row: {
          created_at: string
          date: string
          id: string
          is_blocked: boolean
          panelist_id: string
          reason: string | null
          slots_available: string[] | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_blocked?: boolean
          panelist_id: string
          reason?: string | null
          slots_available?: string[] | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_blocked?: boolean
          panelist_id?: string
          reason?: string | null
          slots_available?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_log_panelist_id_fkey"
            columns: ["panelist_id"]
            isOneToOne: false
            referencedRelation: "panelists"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          added_by: string | null
          added_on: string
          email: string
          id: string
          level_code: Database["public"]["Enums"]["engineering_level"]
          name: string
          notes: string | null
          phone: string | null
          resume_url: string | null
          role_applied: string
          status: Database["public"]["Enums"]["candidate_status"]
        }
        Insert: {
          added_by?: string | null
          added_on?: string
          email: string
          id?: string
          level_code: Database["public"]["Enums"]["engineering_level"]
          name: string
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          role_applied: string
          status?: Database["public"]["Enums"]["candidate_status"]
        }
        Update: {
          added_by?: string | null
          added_on?: string
          email?: string
          id?: string
          level_code?: Database["public"]["Enums"]["engineering_level"]
          name?: string
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          role_applied?: string
          status?: Database["public"]["Enums"]["candidate_status"]
        }
        Relationships: []
      }
      engineering_levels: {
        Row: {
          code: Database["public"]["Enums"]["engineering_level"]
          description: string | null
          title: string
        }
        Insert: {
          code: Database["public"]["Enums"]["engineering_level"]
          description?: string | null
          title: string
        }
        Update: {
          code?: Database["public"]["Enums"]["engineering_level"]
          description?: string | null
          title?: string
        }
        Relationships: []
      }
      hr_panelist_mapping: {
        Row: {
          hr_id: string
          id: string
          panelist_id: string
        }
        Insert: {
          hr_id: string
          id?: string
          panelist_id: string
        }
        Update: {
          hr_id?: string
          id?: string
          panelist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_panelist_mapping_panelist_id_fkey"
            columns: ["panelist_id"]
            isOneToOne: false
            referencedRelation: "panelists"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          cancellation_reason: string | null
          candidate_id: string
          created_at: string
          feedback_url: string | null
          hr_id: string
          id: string
          interview_type: string
          panelist_id: string | null
          resolved_at: string | null
          result: Database["public"]["Enums"]["interview_result"]
          round_number: number
          scheduled_date: string | null
          selection_link_expires_at: string | null
          selection_link_token: string | null
          slot_time: string | null
          status: Database["public"]["Enums"]["interview_status"]
        }
        Insert: {
          cancellation_reason?: string | null
          candidate_id: string
          created_at?: string
          feedback_url?: string | null
          hr_id: string
          id?: string
          interview_type?: string
          panelist_id?: string | null
          resolved_at?: string | null
          result?: Database["public"]["Enums"]["interview_result"]
          round_number?: number
          scheduled_date?: string | null
          selection_link_expires_at?: string | null
          selection_link_token?: string | null
          slot_time?: string | null
          status?: Database["public"]["Enums"]["interview_status"]
        }
        Update: {
          cancellation_reason?: string | null
          candidate_id?: string
          created_at?: string
          feedback_url?: string | null
          hr_id?: string
          id?: string
          interview_type?: string
          panelist_id?: string | null
          resolved_at?: string | null
          result?: Database["public"]["Enums"]["interview_result"]
          round_number?: number
          scheduled_date?: string | null
          selection_link_expires_at?: string | null
          selection_link_token?: string | null
          slot_time?: string | null
          status?: Database["public"]["Enums"]["interview_status"]
        }
        Relationships: [
          {
            foreignKeyName: "interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_panelist_id_fkey"
            columns: ["panelist_id"]
            isOneToOne: false
            referencedRelation: "panelists"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_interventions: {
        Row: {
          candidate_id: string
          flagged_at: string
          hr_id: string
          id: string
          notes: string | null
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          round_number: number
          status: string
        }
        Insert: {
          candidate_id: string
          flagged_at?: string
          hr_id: string
          id?: string
          notes?: string | null
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          round_number?: number
          status?: string
        }
        Update: {
          candidate_id?: string
          flagged_at?: string
          hr_id?: string
          id?: string
          notes?: string | null
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          round_number?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_interventions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      panelist_slot_offers: {
        Row: {
          created_at: string
          id: string
          interview_id: string
          is_selected: boolean
          panelist_availability_status: string | null
          panelist_id: string
          proposed_date: string
          proposed_slot: string
          unavailability_reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          interview_id: string
          is_selected?: boolean
          panelist_availability_status?: string | null
          panelist_id: string
          proposed_date: string
          proposed_slot: string
          unavailability_reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          interview_id?: string
          is_selected?: boolean
          panelist_availability_status?: string | null
          panelist_id?: string
          proposed_date?: string
          proposed_slot?: string
          unavailability_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "panelist_slot_offers_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panelist_slot_offers_panelist_id_fkey"
            columns: ["panelist_id"]
            isOneToOne: false
            referencedRelation: "panelists"
            referencedColumns: ["id"]
          },
        ]
      }
      panelists: {
        Row: {
          added_on: string
          eligible_interview_levels: Database["public"]["Enums"]["engineering_level"][]
          email: string
          emp_id: string
          id: string
          is_active: boolean
          last_interview_date: string | null
          level_code: Database["public"]["Enums"]["engineering_level"]
          name: string
          position: string | null
          total_interviews: number
          total_selected: number
          user_id: string | null
        }
        Insert: {
          added_on?: string
          eligible_interview_levels?: Database["public"]["Enums"]["engineering_level"][]
          email: string
          emp_id: string
          id?: string
          is_active?: boolean
          last_interview_date?: string | null
          level_code: Database["public"]["Enums"]["engineering_level"]
          name: string
          position?: string | null
          total_interviews?: number
          total_selected?: number
          user_id?: string | null
        }
        Update: {
          added_on?: string
          eligible_interview_levels?: Database["public"]["Enums"]["engineering_level"][]
          email?: string
          emp_id?: string
          id?: string
          is_active?: boolean
          last_interview_date?: string | null
          level_code?: Database["public"]["Enums"]["engineering_level"]
          name?: string
          position?: string | null
          total_interviews?: number
          total_selected?: number
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_allowed: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "hr" | "panelist"
      candidate_status:
        | "pending"
        | "scheduled"
        | "in_progress"
        | "selected"
        | "rejected"
        | "manual_intervention"
      engineering_level: "E0" | "E1" | "E2" | "E3" | "E4" | "E5" | "E6" | "E7"
      interview_result: "pending" | "selected" | "rejected" | "next_round"
      interview_status:
        | "awaiting_candidate_selection"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
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
      app_role: ["admin", "hr", "panelist"],
      candidate_status: [
        "pending",
        "scheduled",
        "in_progress",
        "selected",
        "rejected",
        "manual_intervention",
      ],
      engineering_level: ["E0", "E1", "E2", "E3", "E4", "E5", "E6", "E7"],
      interview_result: ["pending", "selected", "rejected", "next_round"],
      interview_status: [
        "awaiting_candidate_selection",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
