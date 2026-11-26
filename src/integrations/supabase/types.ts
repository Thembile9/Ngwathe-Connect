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
      audit_logs: {
        Row: {
          action: string
          actor_name: string | null
          actor_user_id: string | null
          changes: Json
          created_at: string
          department: string | null
          entity_id: string | null
          entity_ref: string | null
          entity_type: string
          id: string
          priority: string | null
          status: string | null
          ward_id: string | null
        }
        Insert: {
          action: string
          actor_name?: string | null
          actor_user_id?: string | null
          changes?: Json
          created_at?: string
          department?: string | null
          entity_id?: string | null
          entity_ref?: string | null
          entity_type: string
          id?: string
          priority?: string | null
          status?: string | null
          ward_id?: string | null
        }
        Update: {
          action?: string
          actor_name?: string | null
          actor_user_id?: string | null
          changes?: Json
          created_at?: string
          department?: string | null
          entity_id?: string | null
          entity_ref?: string | null
          entity_type?: string
          id?: string
          priority?: string | null
          status?: string | null
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          department: string
          icon: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          color: string
          created_at?: string
          department: string
          icon: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          department?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      complaint_events: {
        Row: {
          actor: string | null
          complaint_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          message: string | null
          metadata: Json | null
        }
        Insert: {
          actor?: string | null
          complaint_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          message?: string | null
          metadata?: Json | null
        }
        Update: {
          actor?: string | null
          complaint_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          message?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "complaint_events_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          ai_categorization: Json | null
          ai_summary: string | null
          assigned_department: string | null
          assigned_official: string | null
          category_id: string | null
          channel: string
          created_at: string
          description: string
          id: string
          latitude: number | null
          longitude: number | null
          photo_urls: string[] | null
          priority: Database["public"]["Enums"]["complaint_priority"]
          reference: string
          resident_user_id: string | null
          resident_email: string | null
          resident_id_number: string | null
          resident_name: string
          resident_phone: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          street_address: string | null
          subcategory_id: string | null
          town_id: string | null
          updated_at: string
          wa_phone_number: string | null
          ward_id: string | null
        }
        Insert: {
          ai_categorization?: Json | null
          ai_summary?: string | null
          assigned_department?: string | null
          assigned_official?: string | null
          category_id?: string | null
          channel?: string
          created_at?: string
          description: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_urls?: string[] | null
          priority?: Database["public"]["Enums"]["complaint_priority"]
          reference?: string
          resident_user_id?: string | null
          resident_email?: string | null
          resident_id_number?: string | null
          resident_name: string
          resident_phone: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          street_address?: string | null
          subcategory_id?: string | null
          town_id?: string | null
          updated_at?: string
          wa_phone_number?: string | null
          ward_id?: string | null
        }
        Update: {
          ai_categorization?: Json | null
          ai_summary?: string | null
          assigned_department?: string | null
          assigned_official?: string | null
          category_id?: string | null
          channel?: string
          created_at?: string
          description?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_urls?: string[] | null
          priority?: Database["public"]["Enums"]["complaint_priority"]
          reference?: string
          resident_user_id?: string | null
          resident_email?: string | null
          resident_id_number?: string | null
          resident_name?: string
          resident_phone?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          street_address?: string | null
          subcategory_id?: string | null
          town_id?: string | null
          updated_at?: string
          wa_phone_number?: string | null
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaints_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      job_card_events: {
        Row: {
          actor: string | null
          created_at: string
          event_type: string
          id: string
          job_card_id: string
          message: string | null
          metadata: Json | null
        }
        Insert: {
          actor?: string | null
          created_at?: string
          event_type: string
          id?: string
          job_card_id: string
          message?: string | null
          metadata?: Json | null
        }
        Update: {
          actor?: string | null
          created_at?: string
          event_type?: string
          id?: string
          job_card_id?: string
          message?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "job_card_events_job_card_id_fkey"
            columns: ["job_card_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      job_cards: {
        Row: {
          accepted_at: string | null
          assigned_to: string | null
          complaint_id: string | null
          complaint_received_at: string | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          department: string
          dispatched_at: string | null
          dispatched_by: string | null
          due_at: string | null
          id: string
          job_number: string
          latitude: number | null
          location_text: string | null
          longitude: number | null
          materials_used: string | null
          outcome: string | null
          photo_urls: string[]
          priority: Database["public"]["Enums"]["complaint_priority"]
          resident_name: string | null
          resident_phone: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          town_id: string | null
          updated_at: string
          ward_id: string | null
          work_description: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_to?: string | null
          complaint_id?: string | null
          complaint_received_at?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          department: string
          dispatched_at?: string | null
          dispatched_by?: string | null
          due_at?: string | null
          id?: string
          job_number?: string
          latitude?: number | null
          location_text?: string | null
          longitude?: number | null
          materials_used?: string | null
          outcome?: string | null
          photo_urls?: string[]
          priority?: Database["public"]["Enums"]["complaint_priority"]
          resident_name?: string | null
          resident_phone?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          town_id?: string | null
          updated_at?: string
          ward_id?: string | null
          work_description: string
        }
        Update: {
          accepted_at?: string | null
          assigned_to?: string | null
          complaint_id?: string | null
          complaint_received_at?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          department?: string
          dispatched_at?: string | null
          dispatched_by?: string | null
          due_at?: string | null
          id?: string
          job_number?: string
          latitude?: number | null
          location_text?: string | null
          longitude?: number | null
          materials_used?: string | null
          outcome?: string | null
          photo_urls?: string[]
          priority?: Database["public"]["Enums"]["complaint_priority"]
          resident_name?: string | null
          resident_phone?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          town_id?: string | null
          updated_at?: string
          ward_id?: string | null
          work_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_cards_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_cards_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_cards_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_cards_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          body: string
          category: string
          created_at: string
          ends_at: string | null
          id: string
          published: boolean
          starts_at: string
          title: string
          town_id: string | null
          ward_id: string | null
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          published?: boolean
          starts_at?: string
          title: string
          town_id?: string | null
          ward_id?: string | null
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          published?: boolean
          starts_at?: string
          title?: string
          town_id?: string | null
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notices_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel: {
        Row: {
          active: boolean
          created_at: string
          department: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["staff_role"]
          skills: string[]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          department: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          skills?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          department?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          skills?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          default_priority: Database["public"]["Enums"]["complaint_priority"]
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          category_id: string
          default_priority?: Database["public"]["Enums"]["complaint_priority"]
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          default_priority?: Database["public"]["Enums"]["complaint_priority"]
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          categories: string[] | null
          created_at: string
          id: string
          phone: string
          town_id: string | null
          ward_id: string | null
        }
        Insert: {
          categories?: string[] | null
          created_at?: string
          id?: string
          phone: string
          town_id?: string | null
          ward_id?: string | null
        }
        Update: {
          categories?: string[] | null
          created_at?: string
          id?: string
          phone?: string
          town_id?: string | null
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      towns: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      wards: {
        Row: {
          councillor: string | null
          created_at: string
          id: string
          name: string
          ward_number: number
        }
        Insert: {
          councillor?: string | null
          created_at?: string
          id?: string
          name: string
          ward_number: number
        }
        Update: {
          councillor?: string | null
          created_at?: string
          id?: string
          name?: string
          ward_number?: number
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          complaint_id: string | null
          created_at: string
          direction: string
          id: string
          message_type: string | null
          payload: Json
          phone_number: string
          session_id: string | null
          wa_message_id: string | null
        }
        Insert: {
          complaint_id?: string | null
          created_at?: string
          direction: string
          id?: string
          message_type?: string | null
          payload?: Json
          phone_number: string
          session_id?: string | null
          wa_message_id?: string | null
        }
        Update: {
          complaint_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          message_type?: string | null
          payload?: Json
          phone_number?: string
          session_id?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          created_at: string
          draft: Json
          id: string
          language: string
          last_message_at: string
          phone_number: string
          profile_name: string | null
          state: string
          updated_at: string
          wa_id: string | null
        }
        Insert: {
          created_at?: string
          draft?: Json
          id?: string
          language?: string
          last_message_at?: string
          phone_number: string
          profile_name?: string | null
          state?: string
          updated_at?: string
          wa_id?: string | null
        }
        Update: {
          created_at?: string
          draft?: Json
          id?: string
          language?: string
          last_message_at?: string
          phone_number?: string
          profile_name?: string | null
          state?: string
          updated_at?: string
          wa_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_bootstrap_admin: { Args: never; Returns: boolean }
      current_department: { Args: never; Returns: string }
      current_personnel_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_control_room: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "switchboard" | "supervisor" | "technician"
      complaint_priority: "critical" | "high" | "medium" | "low"
      complaint_status:
        | "new"
        | "acknowledged"
        | "assigned"
        | "in_progress"
        | "on_hold"
        | "resolved"
        | "closed"
      event_type:
        | "created"
        | "status_changed"
        | "assigned"
        | "note"
        | "attachment"
        | "notified"
      job_status:
        | "registered"
        | "assigned"
        | "accepted"
        | "en_route"
        | "in_progress"
        | "completed"
        | "not_completed"
        | "cancelled"
      staff_role: "admin" | "switchboard" | "supervisor" | "technician"
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
      app_role: ["admin", "switchboard", "supervisor", "technician"],
      complaint_priority: ["critical", "high", "medium", "low"],
      complaint_status: [
        "new",
        "acknowledged",
        "assigned",
        "in_progress",
        "on_hold",
        "resolved",
        "closed",
      ],
      event_type: [
        "created",
        "status_changed",
        "assigned",
        "note",
        "attachment",
        "notified",
      ],
      job_status: [
        "registered",
        "assigned",
        "accepted",
        "en_route",
        "in_progress",
        "completed",
        "not_completed",
        "cancelled",
      ],
      staff_role: ["admin", "switchboard", "supervisor", "technician"],
    },
  },
} as const
