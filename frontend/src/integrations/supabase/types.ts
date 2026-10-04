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
      activity_logs: {
        Row: {
          action: string
          category: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          category: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dues: {
        Row: {
          amount_paid: number
          borrower_contact: string | null
          borrower_name: string
          created_at: string
          customer_id: string | null
          date_given: string
          expected_return_date: string | null
          id: string
          notes: string | null
          payments: Json
          principal_amount: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          borrower_contact?: string | null
          borrower_name: string
          created_at?: string
          customer_id?: string | null
          date_given?: string
          expected_return_date?: string | null
          id?: string
          notes?: string | null
          payments?: Json
          principal_amount?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          borrower_contact?: string | null
          borrower_name?: string
          created_at?: string
          customer_id?: string | null
          date_given?: string
          expected_return_date?: string | null
          id?: string
          notes?: string | null
          payments?: Json
          principal_amount?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dues_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          expense_date: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          expense_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          goal_type: string
          id: string
          period_end: string
          period_start: string
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_type: string
          id?: string
          period_end: string
          period_start: string
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_type?: string
          id?: string
          period_end?: string
          period_start?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portals: {
        Row: {
          created_at: string
          default_commission_rate: number | null
          default_site_fee: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_commission_rate?: number | null
          default_site_fee?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_commission_rate?: number | null
          default_site_fee?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          owner_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          settings: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          owner_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          settings?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          owner_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      prediction_tracking: {
        Row: {
          id: string
          user_id: string
          commission_accepted: boolean
          site_fee_accepted: boolean
          both_accepted: boolean
          predicted_commission: number
          predicted_site_fee: number
          actual_commission: number
          actual_site_fee: number
          prediction_source: string
          prediction_confidence: number
          card_type: string
          transaction_type: string
          sent_to: string
          bank_name: string | null
          customer_mode: string | null
          transaction_id: string | null
          amount: number | null
          profit: number | null
          customer_name: string | null
          customer_phone: string | null
          portal_name: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          commission_accepted?: boolean
          site_fee_accepted?: boolean
          both_accepted?: boolean
          predicted_commission?: number
          predicted_site_fee?: number
          actual_commission?: number
          actual_site_fee?: number
          prediction_source?: string
          prediction_confidence?: number
          card_type: string
          transaction_type: string
          sent_to: string
          bank_name?: string | null
          customer_mode?: string | null
          transaction_id?: string | null
          amount?: number | null
          profit?: number | null
          customer_name?: string | null
          customer_phone?: string | null
          portal_name?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          commission_accepted?: boolean
          site_fee_accepted?: boolean
          both_accepted?: boolean
          predicted_commission?: number
          predicted_site_fee?: number
          actual_commission?: number
          actual_site_fee?: number
          prediction_source?: string
          prediction_confidence?: number
          card_type?: string
          transaction_type?: string
          sent_to?: string
          bank_name?: string | null
          customer_mode?: string | null
          transaction_id?: string | null
          amount?: number | null
          profit?: number | null
          customer_name?: string | null
          customer_phone?: string | null
          portal_name?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_tracking_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          bank_name: string | null
          card_type: string | null
          commission: number | null
          commission_percent: number | null
          created_at: string
          customer_id: string | null
          customer_mode: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          portal_id: string
          profit: number | null
          site_fee: number | null
          site_fee_percent: number | null
          transaction_date: string
          transaction_type: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          amount: number
          bank_name?: string | null
          card_type?: string | null
          commission?: number | null
          commission_percent?: number | null
          created_at?: string
          customer_id?: string | null
          customer_mode?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          portal_id: string
          profit?: number | null
          site_fee?: number | null
          site_fee_percent?: number | null
          transaction_date?: string
          transaction_type: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          amount?: number
          bank_name?: string | null
          card_type?: string | null
          commission?: number | null
          commission_percent?: number | null
          created_at?: string
          customer_id?: string | null
          customer_mode?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          portal_id?: string
          profit?: number | null
          site_fee?: number | null
          site_fee_percent?: number | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_portal_id_fkey"
            columns: ["portal_id"]
            isOneToOne: false
            referencedRelation: "portals"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_tracking: {
        Row: {
          actual_commission: number
          actual_site_fee: number
          bank_name: string | null
          both_accepted: boolean
          card_type: string
          commission_accepted: boolean
          created_at: string
          customer_mode: string | null
          id: string
          predicted_commission: number
          predicted_site_fee: number
          prediction_confidence: number
          prediction_source: string
          sent_to: string
          site_fee_accepted: boolean
          transaction_type: string
          user_id: string
        }
        Insert: {
          actual_commission?: number
          actual_site_fee?: number
          bank_name?: string | null
          both_accepted?: boolean
          card_type: string
          commission_accepted?: boolean
          created_at?: string
          customer_mode?: string | null
          id?: string
          predicted_commission?: number
          predicted_site_fee?: number
          prediction_confidence?: number
          prediction_source?: string
          sent_to: string
          site_fee_accepted?: boolean
          transaction_type: string
          user_id: string
        }
        Update: {
          actual_commission?: number
          actual_site_fee?: number
          bank_name?: string | null
          both_accepted?: boolean
          card_type?: string
          commission_accepted?: boolean
          created_at?: string
          customer_mode?: string | null
          id?: string
          predicted_commission?: number
          predicted_site_fee?: number
          prediction_confidence?: number
          prediction_source?: string
          sent_to?: string
          site_fee_accepted?: boolean
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_message_log: {
        Row: {
          action: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          error: string | null
          id: number
          message: string | null
          phone: string
          status: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          error?: string | null
          id?: number
          message?: string | null
          phone: string
          status?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          error?: string | null
          id?: number
          message?: string | null
          phone?: string
          status?: string
          transaction_id?: string | null
          user_id?: string | null
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
      app_role: "admin" | "user" | "staff"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user", "staff"],
    },
  },
} as const
